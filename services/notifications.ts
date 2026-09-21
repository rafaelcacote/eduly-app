import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiClient } from './api';
import { Exercise, exercisesService } from './exercises';
import { Conversation, messagesService } from './messages';
import { Test, testsService } from './tests';

const NOTIFICATION_STATE_KEY = '@eduly:notifications:state:v1';
const PUSH_TOKEN_KEY = '@eduly:push_token';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const MAX_STORED_IDS = 400;
const IS_EXPO_GO_ANDROID =
  Platform.OS === 'android' &&
  (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient');

type NotificationsModule = typeof import('expo-notifications');

interface StudentNotificationState {
  initialized: boolean;
  messageIds: string[];
  exerciseIds: string[];
  examReminderKeys: string[];
}

interface NotificationState {
  byStudentId: Record<string, StudentNotificationState>;
}

const defaultStudentState: StudentNotificationState = {
  initialized: false,
  messageIds: [],
  exerciseIds: [],
  examReminderKeys: [],
};

function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    return new Date(NaN);
  }

  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = Number.parseInt(parts[0], 10);
      const month = Number.parseInt(parts[1], 10) - 1;
      const year = Number.parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map((part) => Number.parseInt(part, 10));
    return new Date(year, month - 1, day);
  }

  return new Date(dateString);
}

function isTomorrow(dateString: string): boolean {
  const target = parseLocalDate(dateString);
  if (Number.isNaN(target.getTime())) {
    return false;
  }

  target.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return target.getTime() === tomorrow.getTime();
}

function trimIds(ids: string[]): string[] {
  if (ids.length <= MAX_STORED_IDS) {
    return ids;
  }

  return ids.slice(ids.length - MAX_STORED_IDS);
}

function isTrabalho(exercise: Exercise): boolean {
  const type = (exercise.tipo_exercicio || '').toLowerCase();
  return type.includes('trabalho');
}

class NotificationsService {
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;
  private initialized = false;
  private selectedStudentId: string | null = null;
  private notificationsModule: NotificationsModule | null = null;
  private handlerConfigured = false;
  private alreadyWarnedUnavailable = false;

  private async getNotificationsModule(): Promise<NotificationsModule | null> {
    if (IS_EXPO_GO_ANDROID) {
      if (!this.alreadyWarnedUnavailable) {
        console.warn('[Push] expo-notifications desativado no Expo Go Android. Use development build para push.');
        this.alreadyWarnedUnavailable = true;
      }
      return null;
    }

    if (this.notificationsModule) {
      return this.notificationsModule;
    }

    try {
      const Notifications = await import('expo-notifications');
      this.notificationsModule = Notifications;

      if (!this.handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        this.handlerConfigured = true;
      }

      return Notifications;
    } catch (error) {
      console.warn('[Push] Falha ao carregar expo-notifications:', error);
      return null;
    }
  }

  // ─── Push Token Registration ─────────────────────────────────────────────

  /**
   * Requests notification permissions and registers the Expo Push Token with
   * the backend API. Should be called after login.
   */
  async registerPushToken(): Promise<void> {
    try {
      const Notifications = await this.getNotificationsModule();
      if (!Notifications) {
        return;
      }

      // Push only works on physical devices (not simulators/emulators)
      const isSimulator = Constants.isDevice === false;
      if (isSimulator) {
        console.log('[Push] Skipping push token registration on simulator/emulator.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Push] Permission not granted for push notifications.');
        return;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('eduly-alertas', {
          name: 'Alertas Eduly',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0EA5E9',
          sound: 'default',
        });
      }

      // Get Expo Push Token (projectId ajuda em builds EAS)
      const projectId =
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

      const tokenData = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;

      // Save locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);

      // Send to backend
      await apiClient.post('/api/mobile/push-tokens', {
        push_token: pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      console.log('[Push] Push token registered:', pushToken);
    } catch (error) {
      console.warn('[Push] Failed to register push token:', error);
    }
  }

  /**
   * Removes the push token from the backend and local storage.
   * Should be called before logout.
   */
  async unregisterPushToken(): Promise<void> {
    try {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (!pushToken) {
        return;
      }

      // Use body (token tem caracteres que quebram path)
      await apiClient.delete('/api/mobile/push-tokens', {
        push_token: pushToken,
      });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      console.log('[Push] Push token unregistered.');
    } catch (error) {
      // Even on failure, clean up local storage so stale token isn't used
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
      console.warn('[Push] Failed to unregister push token:', error);
    }
  }

  /**
   * Returns the currently stored Expo Push Token, or null.
   */
  async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // ─── Polling (local notifications as fallback when app is open) ──────────

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const Notifications = await this.getNotificationsModule();
    if (!Notifications) {
      return;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      await Notifications.requestPermissionsAsync();
    }

    await Notifications.setNotificationChannelAsync('eduly-alertas', {
      name: 'Alertas Eduly',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
      sound: 'default',
    });

    this.initialized = true;
  }

  async start(studentId: string): Promise<void> {
    if (!studentId) {
      return;
    }

    this.selectedStudentId = studentId;
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }

    await this.checkNow();
    this.intervalRef = setInterval(() => {
      this.checkNow();
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    this.selectedStudentId = null;
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private async readState(): Promise<NotificationState> {
    try {
      const rawState = await AsyncStorage.getItem(NOTIFICATION_STATE_KEY);
      if (!rawState) {
        return { byStudentId: {} };
      }

      const parsed = JSON.parse(rawState) as NotificationState;
      if (!parsed?.byStudentId || typeof parsed.byStudentId !== 'object') {
        return { byStudentId: {} };
      }

      return parsed;
    } catch {
      return { byStudentId: {} };
    }
  }

  private async writeState(state: NotificationState): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
  }

  private async checkNow(): Promise<void> {
    if (!this.selectedStudentId || this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const studentId = this.selectedStudentId;
      const [messages, exercises, tests, currentState] = await Promise.all([
        messagesService.getMessages({ aluno_id: studentId }),
        exercisesService.getExercises({ aluno_id: studentId }),
        testsService.getTests({ aluno_id: studentId }),
        this.readState(),
      ]);

      const studentState = currentState.byStudentId[studentId] ?? { ...defaultStudentState };

      if (!studentState.initialized) {
        studentState.initialized = true;
        studentState.messageIds = trimIds(
          messages.map((item) => item.id || item.conversa_id).filter(Boolean) as string[]
        );
        studentState.exerciseIds = trimIds(exercises.map((item) => item.id));
        studentState.examReminderKeys = trimIds(
          tests.filter((item) => isTomorrow(item.data_prova)).map((item) => `${item.id}:tomorrow`)
        );

        currentState.byStudentId[studentId] = studentState;
        await this.writeState(currentState);
        return;
      }

      await this.notifyNewMessages(messages, studentState);
      await this.notifyExercises(exercises, studentState);
      await this.notifyExamReminders(tests, studentState);

      currentState.byStudentId[studentId] = {
        ...studentState,
        messageIds: trimIds(studentState.messageIds),
        exerciseIds: trimIds(studentState.exerciseIds),
        examReminderKeys: trimIds(studentState.examReminderKeys),
      };
      await this.writeState(currentState);
    } catch (error) {
      console.warn('Erro ao verificar notificacoes:', error);
    } finally {
      this.isChecking = false;
    }
  }

  private async notifyNewMessages(
    messages: Conversation[],
    studentState: StudentNotificationState
  ): Promise<void> {
    const Notifications = await this.getNotificationsModule();
    if (!Notifications) {
      return;
    }

    for (const message of messages) {
      const trackingId = message.id || message.conversa_id;
      if (!trackingId || studentState.messageIds.includes(trackingId)) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Novo recado da escola',
          body: message.titulo || message.ultima_mensagem?.titulo || 'Voce recebeu um novo recado.',
          data: {
            type: 'message',
            messageId: message.id || '',
            conversaId: message.conversa_id || '',
          },
          sound: 'default',
        },
        trigger: null,
      });

      studentState.messageIds.push(trackingId);
    }
  }

  private async notifyExercises(exercises: Exercise[], studentState: StudentNotificationState): Promise<void> {
    const Notifications = await this.getNotificationsModule();
    if (!Notifications) {
      return;
    }

    for (const exercise of exercises) {
      if (studentState.exerciseIds.includes(exercise.id)) {
        continue;
      }

      const workItem = isTrabalho(exercise);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: workItem ? 'Novo trabalho para entregar' : 'Novo exercicio registrado',
          body: exercise.titulo || 'Confira os detalhes da atividade.',
          data: { type: workItem ? 'work' : 'exercise', exerciseId: exercise.id },
          sound: 'default',
        },
        trigger: null,
      });

      studentState.exerciseIds.push(exercise.id);
    }
  }

  private async notifyExamReminders(tests: Test[], studentState: StudentNotificationState): Promise<void> {
    const Notifications = await this.getNotificationsModule();
    if (!Notifications) {
      return;
    }

    for (const test of tests) {
      if (!isTomorrow(test.data_prova)) {
        continue;
      }

      const reminderKey = `${test.id}:tomorrow`;
      if (studentState.examReminderKeys.includes(reminderKey)) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete: prova amanha',
          body: test.titulo || 'Voce tem uma prova marcada para amanha.',
          data: { type: 'exam_reminder', testId: test.id },
          sound: 'default',
        },
        trigger: null,
      });

      studentState.examReminderKeys.push(reminderKey);
    }
  }
}

export const notificationsService = new NotificationsService();

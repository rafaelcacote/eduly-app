import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { StudentProvider, useStudent } from '@/context/StudentContext';
import { Colors } from '@/constants/colors';
import { notificationsService } from '@/services/notifications';
import { InstallPrompt } from '@/components/InstallPrompt';

// Mantém a splash screen visível até que o app esteja pronto
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { selectedStudent } = useStudent();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  // Garante que tem tanto isAuthenticated quanto user válido
  const hasSession = isAuthenticated && !!user && !!user.id;

  useEffect(() => {
    if (isLoading) return; // Aguarda o carregamento do estado de autenticação

    const currentSegment = segments[0] || '';
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'forgot-password' || currentSegment === 'reset-password';
    const publicRoutes = ['brand']; // Rotas públicas que não exigem autenticação
    
    // Rotas protegidas que exigem autenticação
    const protectedRoutes = [
      '(tabs)',
      'teacher-dashboard',
      'messages',
      'send-message',
      'send-message-parent',
      'exercises',
      'create-exercise',
      'exams',
      'create-exam',
      'report',
      'message-detail',
      'aviso-detail',
      'exercise-detail',
      'documentos',
      'documento-detail',
      'enviar-atestado',
      'pedir-declaracao',
      'financeiro',
      'financeiro-detail',
      'perfil',
      'change-password',
    ];

    // Se não estiver autenticado e tentar acessar rota protegida, redireciona para login
    if (!hasSession) {
      // Permite acesso a rotas públicas e de autenticação
      if (publicRoutes.includes(currentSegment) || inAuthGroup) {
        return;
      }
      if (protectedRoutes.includes(currentSegment) || currentSegment === '') {
        // Evita loop infinito de redirecionamento
        if (currentSegment !== 'login') {
          router.replace('/login');
        }
      }
      return;
    }

    // Se estiver autenticado e tentar acessar login/register, redireciona para home correta
    if (hasSession && inAuthGroup) {
      router.replace(user?.type === 'teacher' ? '/teacher-dashboard' : '/(tabs)');
      return;
    }

    // Se estiver autenticado na raiz, envia para a home do perfil
    if (hasSession && currentSegment === '') {
      router.replace(user?.type === 'teacher' ? '/teacher-dashboard' : '/(tabs)');
    }
  }, [hasSession, isLoading, segments, router, user?.type]);

  useEffect(() => {
    let active = true;

    const setupNotifications = async () => {
      if (!hasSession) {
        notificationsService.stop();
        return;
      }

      // Registra token push para pai e professora (build/APK)
      await notificationsService.registerPushToken().catch((err) =>
        console.warn('[Push] Failed to register token on session:', err)
      );

      // Polling local continua só para responsável (fallback com app aberto)
      if (user?.type !== 'responsavel' || !selectedStudent?.id) {
        notificationsService.stop();
        return;
      }

      await notificationsService.initialize();
      if (active) {
        await notificationsService.start(selectedStudent.id);
      }
    };

    setupNotifications();

    return () => {
      active = false;
      notificationsService.stop();
    };
  }, [hasSession, selectedStudent?.id, user?.type]);

  // Handle notification taps — navigate to the correct screen
  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | null = null;

    const setupNotificationListener = async () => {
      const isExpoGoAndroid =
        Platform.OS === 'android' &&
        (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient');

      if (isExpoGoAndroid) {
        return;
      }

      try {
        const Notifications = await import('expo-notifications');
        if (!active) {
          return;
        }

        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, string> | undefined;
          if (!data) return;

          switch (data.type) {
            case 'message':
              if (data.conversaId || data.messageId) {
                router.push({
                  pathname: '/message-detail',
                  params: {
                    ...(data.conversaId ? { conversaId: data.conversaId } : {}),
                    ...(data.messageId ? { messageId: data.messageId } : {}),
                  },
                });
              } else {
                router.push('/messages');
              }
              break;
            case 'exercise':
            case 'work':
              if (data.exerciseId) {
                router.push({
                  pathname: '/exercise-detail',
                  params: { exerciseId: data.exerciseId },
                });
              } else {
                router.push('/exercises');
              }
              break;
            case 'exam':
            case 'exam_reminder':
              router.push('/exams');
              break;
            case 'aviso':
            case 'comunicado':
              if (data.avisoId) {
                router.push({
                  pathname: '/aviso-detail',
                  params: { avisoId: data.avisoId },
                });
              } else {
                router.push('/messages');
              }
              break;
            case 'documento':
            case 'document':
            case 'atestado':
              if (data.documentoId) {
                router.push({
                  pathname: '/documento-detail',
                  params: { documentoId: data.documentoId },
                });
              } else {
                router.push('/documentos');
              }
              break;
            default:
              break;
          }
        });
      } catch (error) {
        console.warn('[Push] Falha ao configurar listener de notificacoes:', error);
      }
    };

    setupNotificationListener();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [router]);

  // Esconde a splash screen quando o app terminar de carregar
  useEffect(() => {
    if (!isLoading) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Enquanto está carregando, mostra apenas o loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  // Se não estiver autenticado, só renderiza telas de autenticação e públicas
  if (!hasSession) {
    const currentSegment = segments[0] || '';
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'forgot-password' || currentSegment === 'reset-password';
    const publicRoutes = ['brand'];
    
    // Se não estiver na tela de autenticação ou pública, mostra loading até redirecionar
    if (!inAuthGroup && !publicRoutes.includes(currentSegment)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    
    // Renderiza telas de autenticação e públicas quando não está logado
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="brand" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  // Renderiza todas as telas quando autenticado
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teacher-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="brand" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="message-detail" options={{ headerShown: false }} />
        <Stack.Screen name="aviso-detail" options={{ headerShown: false }} />
        <Stack.Screen name="send-message" options={{ headerShown: false }} />
        <Stack.Screen name="send-message-parent" options={{ headerShown: false }} />
        <Stack.Screen name="exercises" options={{ headerShown: false }} />
        <Stack.Screen name="exercise-detail" options={{ headerShown: false }} />
        <Stack.Screen name="create-exercise" options={{ headerShown: false }} />
        <Stack.Screen name="exams" options={{ headerShown: false }} />
        <Stack.Screen name="create-exam" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="documentos" options={{ headerShown: false }} />
        <Stack.Screen name="documento-detail" options={{ headerShown: false }} />
        <Stack.Screen name="enviar-atestado" options={{ headerShown: false }} />
        <Stack.Screen name="pedir-declaracao" options={{ headerShown: false }} />
        <Stack.Screen name="financeiro" options={{ headerShown: false }} />
        <Stack.Screen name="financeiro-detail" options={{ headerShown: false }} />
        <Stack.Screen name="perfil" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StudentProvider>
        <RootLayoutNav />
        <InstallPrompt />
      </StudentProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

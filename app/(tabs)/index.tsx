import BottomNav from '@/components/BottomNav';
import { LoadingSquares } from '@/components/loading-squares';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Exercise, exercisesService } from '@/services/exercises';
import { Message, messagesService } from '@/services/messages';
import { Student } from '@/services/students';
import { Test, testsService } from '@/services/tests';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, LogOut, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Home() {
  const router = useRouter();
  const { logout, isAuthenticated, user, isLoading: isLoadingAuth } = useAuth();
  const { students, selectedStudent, isLoading: isLoadingStudents, setSelectedStudent } = useStudent();
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshingManually, setIsRefreshingManually] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tests, setTests] = useState<Test[]>([]);

  // Proteção: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type === 'teacher') {
      router.replace('/teacher-dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  // Se não estiver autenticado ou ainda estiver carregando, mostra loading
  if (isLoadingAuth || !isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredLoadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const handleSelectStudent = async (student: NonNullable<typeof selectedStudent>) => {
    if (selectedStudent?.id === student.id) {
      setShowStudentSelector(false);
      return;
    }

    setShowStudentSelector(false);
    setIsChangingStudent(true);

    // Simula um pequeno delay para mostrar o loading e transição suave
    await new Promise(resolve => setTimeout(resolve, 600));

    await setSelectedStudent(student);
    setIsChangingStudent(false);
  };

  const getStudentDisplayText = (student: Student | null): string => {
    if (!student || student.turmas.length === 0) {
      return 'Carregando...';
    }

    const turma = student.turmas[0]; // Pega a primeira turma ativa
    const nome = student.nome_social || student.nome;
    return `${nome} - ${turma.serie} ${turma.turma_letra}`;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              // O redirecionamento será feito automaticamente pelo _layout.tsx
            } catch (error) {
              setIsLoggingOut(false);
              Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const loadDashboardData = useCallback(async () => {
    if (!selectedStudent?.id) {
      setMessages([]);
      setExercises([]);
      setTests([]);
      return;
    }

    try {
      const [messagesData, exercisesData, testsData] = await Promise.all([
        messagesService.getMessages({ aluno_id: selectedStudent.id }),
        exercisesService.getExercises({ aluno_id: selectedStudent.id }),
        testsService.getTests({ aluno_id: selectedStudent.id }),
      ]);

      setMessages(messagesData);
      setExercises(exercisesData);
      setTests(testsData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível carregar o painel.');
    }
  }, [selectedStudent?.id]);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || user?.type === 'teacher' || isLoadingStudents) return;
      setIsLoadingDashboard(true);
      await loadDashboardData();
      setIsLoadingDashboard(false);
    };
    load();
  }, [isAuthenticated, user?.type, isLoadingStudents, loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  }, [loadDashboardData]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshingManually(true);
    await loadDashboardData();
    setIsRefreshingManually(false);
  }, [loadDashboardData]);

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Ontem ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getMessageIcon = (message: Message): string => {
    const fullText = `${message.titulo} ${message.conteudo}`.toLowerCase();

    if (fullText.includes('trabalho')) {
      return '✍️';
    }
    if (fullText.includes('exercicio') || fullText.includes('exercício') || fullText.includes('livro')) {
      return '📚';
    }
    if (
      message.tipo === 'aviso' ||
      message.tipo === 'atencao' ||
      fullText.includes('aviso') ||
      fullText.includes('mensagem')
    ) {
      return '⚠️';
    }
    return '⚠️';
  };

  const getExerciseIcon = (exercise: Exercise): string => {
    const type = (exercise.tipo_exercicio || '').toLowerCase().trim();
    if (type.includes('trabalho')) {
      return '✍️';
    }
    return '📚';
  };

  const recentMessages = useMemo(
    () =>
      [...messages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [messages]
  );

  const recentExercises = useMemo(
    () =>
      [...exercises]
        .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
        .slice(0, 4),
    [exercises]
  );

  const upcomingTests = useMemo(
    () =>
      [...tests]
        .filter((test) => new Date(test.data_prova).getTime() >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => new Date(a.data_prova).getTime() - new Date(b.data_prova).getTime())
        .slice(0, 4),
    [tests]
  );

  const unreadMessages = useMemo(() => messages.filter((msg) => !msg.lida).length, [messages]);

  const pendingExercises = useMemo(
    () => exercises.filter((exercise) => new Date(exercise.data_entrega).getTime() >= new Date().setHours(0, 0, 0, 0)).length,
    [exercises]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Agenda Escolar</Text>
          {isLoadingStudents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
              <Text style={styles.headerSubtitle}>Carregando...</Text>
            </View>
          ) : students.length > 1 ? (
            <TouchableOpacity
              style={styles.studentSelector}
              onPress={() => setShowStudentSelector(true)}
            >
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {getStudentDisplayText(selectedStudent)}
              </Text>
              <ChevronDown size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {getStudentDisplayText(selectedStudent)}
            </Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/messages')}>
            <Bell size={20} color={Colors.text} />
            {unreadMessages > 0 ? <View style={styles.badge} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleManualRefresh}>
            <RefreshCw size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={Colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeTitle}>
            Olá, {user?.nome_completo || '...'}!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Bem-vindo agenda escolar {selectedStudent?.school?.nome || '...'}.
          </Text>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>{pendingExercises}</Text>
            <Text style={styles.statLabel}>Exercícios pendentes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.secondary }]}>{upcomingTests.length}</Text>
            <Text style={styles.statLabel}>Próximas provas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagens Recentes</Text>
          <View style={styles.messagesList}>
            {isLoadingDashboard ? (
              <View style={styles.emptyContainer}>
                <LoadingSquares squareSize={16} gap={6} />
              </View>
            ) : recentMessages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma mensagem recente</Text>
              </View>
            ) : (
              recentMessages.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.messageCard}
                  onPress={() => router.push('/messages')}
                >
                  <Text style={styles.messageIcon}>{getMessageIcon(msg)}</Text>
                  <View style={styles.messageContent}>
                    <Text style={styles.messageTitle} numberOfLines={1}>{msg.titulo}</Text>
                    <Text style={styles.messageSubtitle} numberOfLines={1}>{msg.tipo}</Text>
                  </View>
                  <Text style={styles.messageTime}>{formatRelativeDate(msg.created_at)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercícios</Text>
          <View style={styles.eventsList}>
            {isLoadingDashboard ? (
              <View style={styles.emptyContainer}>
                <LoadingSquares squareSize={16} gap={6} />
              </View>
            ) : recentExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum exercício disponível</Text>
              </View>
            ) : (
              recentExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.eventCard}
                  onPress={() => router.push('/exercises')}
                >
                  <Text style={styles.messageIcon}>{getExerciseIcon(exercise)}</Text>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{exercise.titulo}</Text>
                    <Text style={styles.eventSubtitle} numberOfLines={1}>
                      Entrega: {formatRelativeDate(exercise.data_entrega)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximas Provas</Text>
          <View style={styles.eventsList}>
            {isLoadingDashboard ? (
              <View style={styles.emptyContainer}>
                <LoadingSquares squareSize={16} gap={6} />
              </View>
            ) : upcomingTests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma prova próxima</Text>
              </View>
            ) : (
              upcomingTests.map((test) => (
                <TouchableOpacity key={test.id} style={styles.eventCard} onPress={() => router.push('/exams')}>
                  <View style={[styles.eventDate, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.eventDateText, { color: '#dc2626' }]}>
                      {new Date(test.data_prova).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{test.titulo}</Text>
                    <Text style={styles.eventSubtitle} numberOfLines={1}>
                      {test.disciplina?.nome || 'Disciplina'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <BottomNav />

      {/* Modal para seleção de aluno */}
      <Modal
        visible={showStudentSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStudentSelector(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Aluno</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {students.map((student) => {
                const turma = student.turmas[0];
                const nome = student.nome_social || student.nome;
                const isSelected = selectedStudent?.id === student.id;

                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentOption,
                      isSelected && styles.studentOptionSelected,
                    ]}
                    onPress={() => handleSelectStudent(student)}
                  >
                    <View style={styles.studentOptionContent}>
                      <Text style={styles.studentOptionName}>{nome}</Text>
                      {turma && (
                        <Text style={styles.studentOptionTurma}>
                          {turma.serie} {turma.turma_letra}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Overlay de loading ao trocar de aluno */}
      <Modal
        visible={isChangingStudent}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <LoadingSquares squareSize={20} gap={8} />
            <Text style={styles.loadingText}>Carregando aluno...</Text>
          </View>
        </View>
      </Modal>

      {/* Overlay de loading ao atualizar/sair */}
      <Modal
        visible={isLoggingOut || isRefreshingManually}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <LoadingSquares squareSize={20} gap={8} />
            <Text style={styles.loadingText}>
              {isLoggingOut ? 'Saindo do sistema...' : 'Atualizando painel...'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  centeredLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  messagesList: {
    gap: 8,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageIcon: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  messageSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventsList: {
    gap: 8,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventDate: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventDateText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  eventSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventContent: {
    flex: 1,
  },
  emptyContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  studentOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentOptionSelected: {
    backgroundColor: Colors.background,
  },
  studentOptionContent: {
    flex: 1,
  },
  studentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  studentOptionTurma: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 12,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
});

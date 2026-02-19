import BottomNav from '@/components/BottomNav';
import { LoadingSquares } from '@/components/loading-squares';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Exercise, exercisesService } from '@/services/exercises';
import { Message, messagesService } from '@/services/messages';
import { Test, testsService } from '@/services/tests';
import { teachersService, Turma } from '@/services/teachers';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  LogOut,
  Mail,
  RefreshCw,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const getSafeDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (dateString?: string | null): string => {
  const date = getSafeDate(dateString);
  if (!date) return 'Sem data';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingManually, setIsRefreshingManually] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type !== 'teacher') {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [messagesData, exercisesData, testsData, turmasData] = await Promise.all([
        messagesService.getMessages(),
        exercisesService.getExercises(),
        testsService.getTests(),
        teachersService.getTurmas(),
      ]);

      setMessages(messagesData);
      setExercises(exercisesData);
      setTests(testsData);
      setTurmas(turmasData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível carregar o dashboard.');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || user?.type !== 'teacher') return;
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };
    load();
  }, [isAuthenticated, user?.type, loadDashboardData]);

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

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch (error) {
            setIsLoggingOut(false);
            Alert.alert('Erro', 'Não foi possível sair agora. Tente novamente.');
          }
        },
      },
    ]);
  };

  const handleOpenTurmaAlunos = (turma: Turma) => {
    router.push({
      pathname: '/turma-alunos',
      params: {
        turmaId: turma.id,
        serie: turma.serie,
        turma_letra: turma.turma_letra,
      },
    });
  };

  const unreadMessages = useMemo(() => messages.filter((msg) => !msg.lida).length, [messages]);

  const upcomingTests = useMemo(() => {
    const now = new Date().getTime();
    return tests
      .filter((test) => {
        const date = getSafeDate(test.data_prova);
        return !!date && date.getTime() >= now;
      })
      .sort((a, b) => {
        const aDate = getSafeDate(a.data_prova)?.getTime() || 0;
        const bDate = getSafeDate(b.data_prova)?.getTime() || 0;
        return aDate - bDate;
      });
  }, [tests]);

  const latestMessages = useMemo(() => {
    return [...messages]
      .sort((a, b) => {
        const aDate = getSafeDate(a.created_at)?.getTime() || 0;
        const bDate = getSafeDate(b.created_at)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [messages]);

  if (isLoadingAuth || !isAuthenticated || user?.type !== 'teacher') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerBrand}>Painel do Professor</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {user?.nome_completo}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleManualRefresh}>
              <RefreshCw size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleLogout}>
              <LogOut size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
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
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIcon}>
            <GraduationCap size={22} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle}>Visão geral da sua rotina</Text>
          <Text style={styles.heroSubtitle}>
            Organize mensagens, exercícios e provas em um só lugar.
          </Text>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <LoadingSquares squareSize={18} gap={8} />
            <Text style={styles.loadingText}>Carregando informações...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff' }]}>
                  <Mail size={18} color={Colors.primary} />
                </View>
                <Text style={styles.metricValue}>{unreadMessages}</Text>
                <Text style={styles.metricLabel}>Mensagens não lidas</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
                  <BookOpen size={18} color={Colors.success} />
                </View>
                <Text style={styles.metricValue}>{exercises.length}</Text>
                <Text style={styles.metricLabel}>Exercícios ativos</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <ClipboardList size={18} color={Colors.error} />
                </View>
                <Text style={styles.metricValue}>{upcomingTests.length}</Text>
                <Text style={styles.metricLabel}>Provas futuras</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ações rápidas</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickButton} onPress={() => router.push('/messages')}>
                  <Bell size={18} color={Colors.primary} />
                  <Text style={styles.quickButtonText}>Mensagens</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickButton} onPress={() => router.push('/create-exam')}>
                  <ClipboardList size={18} color={Colors.primary} />
                  <Text style={styles.quickButtonText}>Nova prova</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickButton} onPress={() => router.push('/create-exercise')}>
                  <BookOpen size={18} color={Colors.primary} />
                  <Text style={styles.quickButtonText}>Novo exercício</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próximas provas</Text>
                <TouchableOpacity onPress={() => router.push('/exams')}>
                  <Text style={styles.sectionLink}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {upcomingTests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <CalendarClock size={20} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Nenhuma prova futura cadastrada.</Text>
                </View>
              ) : (
                upcomingTests.slice(0, 3).map((test) => (
                  <TouchableOpacity
                    key={test.id}
                    style={styles.listCard}
                    onPress={() => router.push('/exams')}
                  >
                    <View style={styles.listCardLeft}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {test.titulo}
                      </Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>
                        {test.disciplina?.nome || 'Disciplina'} - {test.turma?.serie && test.turma?.turma_letra ? `${test.turma.serie} ${test.turma.turma_letra}` : test.turma?.nome || 'Turma'}
                      </Text>
                    </View>
                    <Text style={styles.listDate}>{formatDate(test.data_prova)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Minhas Turmas</Text>
              </View>
              {turmas.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Users size={20} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Nenhuma turma encontrada.</Text>
                </View>
              ) : (
                turmas.map((turma) => (
                  <TouchableOpacity
                    key={turma.id}
                    style={styles.listCard}
                    onPress={() => handleOpenTurmaAlunos(turma)}
                  >
                    <View style={styles.listCardLeft}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {turma.serie} {turma.turma_letra}
                      </Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>
                        Ano Letivo: {turma.ano_letivo}
                      </Text>
                    </View>
                    <Users size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mensagens recentes</Text>
                <TouchableOpacity onPress={() => router.push('/messages')}>
                  <Text style={styles.sectionLink}>Abrir</Text>
                </TouchableOpacity>
              </View>
              {latestMessages.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Mail size={20} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Você ainda não possui mensagens.</Text>
                </View>
              ) : (
                latestMessages.map((message) => (
                  <TouchableOpacity
                    key={message.id}
                    style={styles.listCard}
                    onPress={() => router.push('/messages')}
                  >
                    <View style={styles.listCardLeft}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {message.titulo}
                      </Text>
                      <Text style={styles.listSubtitle} numberOfLines={2}>
                        {message.conteudo}
                      </Text>
                    </View>
                    <View style={styles.messageMeta}>
                      {!message.lida && <View style={styles.unreadDot} />}
                      <Text style={styles.listDate}>{formatDate(message.created_at)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav />

      <View pointerEvents={isLoggingOut || isRefreshingManually ? 'auto' : 'none'} style={[styles.overlay, !isLoggingOut && !isRefreshingManually && styles.hidden]}>
        <View style={styles.overlayCard}>
          <LoadingSquares squareSize={18} gap={8} />
          <Text style={styles.overlayText}>
            {isLoggingOut ? 'Encerrando sessão...' : 'Atualizando página...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff5ff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff5ff',
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 14,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerName: {
    fontSize: 19,
    color: Colors.text,
    fontWeight: '700',
    maxWidth: 240,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#dbe4f0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  quickButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listCardLeft: {
    flex: 1,
  },
  listTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  listSubtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  listDate: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  messageMeta: {
    alignItems: 'flex-end',
    gap: 5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
  },
  overlayCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    color: Colors.text,
    fontWeight: '500',
  },
});

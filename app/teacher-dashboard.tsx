import BottomNav from '@/components/BottomNav';
import { HEADER_GRADIENT } from '@/components/AppHeader';
import { LoadingSquares } from '@/components/loading-squares';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { PulsingDot } from '@/components/PulsingDot';
import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { getUserPhotoUrl } from '@/services/auth';
import { Aviso, avisosService } from '@/services/avisos';
import { Exercise, exercisesService } from '@/services/exercises';
import { Conversation, messagesService } from '@/services/messages';
import { Test, testsService } from '@/services/tests';
import { teachersService, Turma } from '@/services/teachers';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  LogOut,
  Mail,
  Megaphone,
  RefreshCw,
  Users,
} from 'lucide-react-native';
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [lastSeenAvisosAt, setLastSeenAvisosAt] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schoolLogoFailed, setSchoolLogoFailed] = useState(false);

  const schoolName = useMemo(
    () => turmas[0]?.school?.nome || turmas[0]?.escola?.nome || null,
    [turmas]
  );
  const schoolLogoUrl = useMemo(
    () => resolveMediaUrl(turmas[0]?.school?.logo_url),
    [turmas]
  );

  useEffect(() => {
    setSchoolLogoFailed(false);
  }, [schoolLogoUrl]);

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
      const [messagesData, exercisesData, testsData, turmasData, avisosRes, lastSeen] =
        await Promise.all([
          messagesService.getMessages(),
          exercisesService.getExercises(),
          testsService.getTests(),
          teachersService.getTurmas(),
          avisosService.getAvisos({ page: 1 }).catch(() => ({ avisos: [] as Aviso[] })),
          avisosService.getLastSeenAvisosAt(),
        ]);

      setMessages(messagesData);
      setExercises(exercisesData);
      setTests(testsData);
      setTurmas(turmasData);
      setAvisos(avisosRes.avisos || []);
      setLastSeenAvisosAt(lastSeen);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível carregar o dashboard.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!isAuthenticated || user?.type !== 'teacher') return;
        setIsLoading(true);
        await loadDashboardData();
        setIsLoading(false);
      };
      load();
    }, [isAuthenticated, user?.type, loadDashboardData])
  );

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

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      if (Platform.OS === 'web') {
        window.alert('Não foi possível sair agora. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível sair agora. Tente novamente.');
      }
    }
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

  const unreadMessages = useMemo(
    () => messages.reduce((total, msg) => total + (msg.unread_count ?? (msg.lida ? 0 : 1)), 0),
    [messages]
  );

  const newAvisosCount = useMemo(
    () => avisos.filter((aviso) => avisosService.isAvisoNew(aviso, lastSeenAvisosAt)).length,
    [avisos, lastSeenAvisosAt]
  );

  const communicationAttentionCount = unreadMessages + newAvisosCount;

  const latestAvisos = useMemo(() => {
    return [...avisos]
      .sort((a, b) => {
        const aDate = getSafeDate(a.publicado_em || a.created_at)?.getTime() || 0;
        const bDate = getSafeDate(b.publicado_em || b.created_at)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [avisos]);

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
        const aDate = getSafeDate(a.updated_at || a.created_at || a.ultima_mensagem?.created_at)?.getTime() || 0;
        const bDate = getSafeDate(b.updated_at || b.created_at || b.ultima_mensagem?.created_at)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [messages]);

  const firstName = useMemo(() => {
    const full = user?.nome_completo?.trim();
    if (!full) return 'Professor(a)';
    return full.split(/\s+/)[0];
  }, [user?.nome_completo]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const todayLabel = useMemo(() => {
    const label = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, []);

  const focusSummary = useMemo(() => {
    const parts: string[] = [];
    if (communicationAttentionCount > 0) {
      parts.push(
        communicationAttentionCount === 1
          ? '1 comunicação nova'
          : `${communicationAttentionCount} comunicações novas`
      );
    }
    if (upcomingTests[0]) {
      parts.push(`próxima prova em ${formatDate(upcomingTests[0].data_prova)}`);
    }
    if (parts.length === 0) {
      return 'Nada urgente por agora — bom momento para planejar.';
    }
    return parts.join(' · ');
  }, [communicationAttentionCount, upcomingTests]);

  const hasAttention = communicationAttentionCount > 0 || upcomingTests.length > 0;

  if (isLoadingAuth || !isAuthenticated || user?.type !== 'teacher') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <View style={styles.headerSchoolLogoFrame}>
              {schoolLogoUrl && !schoolLogoFailed ? (
                <Image
                  source={{ uri: schoolLogoUrl }}
                  style={styles.headerSchoolLogo}
                  contentFit="contain"
                  accessibilityLabel={schoolName ? `Logo da ${schoolName}` : 'Logo da escola'}
                  onError={() => setSchoolLogoFailed(true)}
                />
              ) : (
                <Building2 size={18} color={Colors.primary} strokeWidth={2.25} />
              )}
            </View>

            <View style={styles.headerBrandDivider} />

            <View style={styles.headerEdullyBlock}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.headerEdullyLogo}
                contentFit="contain"
                accessibilityLabel="Edully"
              />
              <View style={styles.headerWordmark}>
                <Text style={styles.headerWordmarkLine}>AGENDA</Text>
                <Text style={styles.headerWordmarkLineAccent}>ESCOLAR</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/messages')}
              accessibilityLabel="Abrir comunicação"
            >
              <Bell size={18} color={Colors.white} />
              {communicationAttentionCount > 0 ? (
                <PulsingDot size={8} style={styles.headerPulseBadge} />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleManualRefresh}
              accessibilityLabel="Atualizar painel"
            >
              <RefreshCw size={18} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleLogout}
              accessibilityLabel="Sair do aplicativo"
            >
              <LogOut size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.teacherIdentityCard}>
          <StudentAvatar
            nome={user?.nome_completo || 'Professor'}
            fotoUrl={getUserPhotoUrl(user)}
            size="lg"
          />
          <View style={styles.teacherIdentityText}>
            <Text style={styles.teacherEyebrow}>Professor(a)</Text>
            <Text style={styles.teacherName} numberOfLines={1}>
              {user?.nome_completo}
            </Text>
            {!!schoolName && (
              <Text style={styles.teacherSchool} numberOfLines={1}>
                {schoolName}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.welcomeBlock}>
          <Text style={styles.welcomeGreeting}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.welcomeDate}>{todayLabel}</Text>
          <View style={[styles.focusPill, hasAttention ? styles.focusPillAlert : styles.focusPillCalm]}>
            <View
              style={[
                styles.focusDot,
                hasAttention ? styles.focusDotAlert : styles.focusDotCalm,
              ]}
            />
            <Text
              style={[
                styles.focusText,
                hasAttention ? styles.focusTextAlert : styles.focusTextCalm,
              ]}
              numberOfLines={2}
            >
              {isLoading ? 'Carregando sua agenda...' : focusSummary}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <LoadingSquares squareSize={18} gap={8} />
            <Text style={styles.loadingText}>Carregando informações...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/messages')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir comunicação"
              >
                <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff' }]}>
                  <Mail size={18} color={Colors.primary} />
                </View>
                <Text style={styles.metricValue}>{communicationAttentionCount}</Text>
                <Text style={styles.metricLabel}>Comunicação</Text>
                {communicationAttentionCount > 0 && <View style={styles.metricAttentionDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/exercises')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir exercícios"
              >
                <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
                  <BookOpen size={18} color={Colors.success} />
                </View>
                <Text style={styles.metricValue}>{exercises.length}</Text>
                <Text style={styles.metricLabel}>Exercícios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/exams')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir provas"
              >
                <View style={[styles.metricIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <ClipboardList size={18} color={Colors.error} />
                </View>
                <Text style={styles.metricValue}>{upcomingTests.length}</Text>
                <Text style={styles.metricLabel}>Provas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ações rápidas</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickButton} onPress={() => router.push('/messages')}>
                  <Bell size={18} color={Colors.primary} />
                  <Text style={styles.quickButtonText}>Comunicação</Text>
                  {communicationAttentionCount > 0 && <PulsingDot size={8} />}
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
                <Text style={styles.sectionTitle}>Comunicados da escola</Text>
                <TouchableOpacity onPress={() => router.push('/messages')}>
                  <Text style={styles.sectionLink}>Abrir</Text>
                </TouchableOpacity>
              </View>
              {latestAvisos.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Megaphone size={20} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Nenhum comunicado recente.</Text>
                </View>
              ) : (
                latestAvisos.map((aviso) => {
                  const isNew = avisosService.isAvisoNew(aviso, lastSeenAvisosAt);
                  return (
                    <TouchableOpacity
                      key={aviso.id}
                      style={[styles.listCard, isNew && styles.avisoCardNew]}
                      onPress={() =>
                        router.push({
                          pathname: '/aviso-detail',
                          params: { avisoId: aviso.id },
                        })
                      }
                    >
                      <View style={styles.listCardLeft}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {aviso.titulo}
                        </Text>
                        <Text style={styles.listSubtitle} numberOfLines={2}>
                          {aviso.conteudo}
                        </Text>
                      </View>
                      <View style={styles.messageMeta}>
                        {isNew && <PulsingDot size={8} color="#0f766e" />}
                        <Text style={styles.listDate}>
                          {formatDate(aviso.publicado_em || aviso.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recados recentes</Text>
                <TouchableOpacity onPress={() => router.push('/messages')}>
                  <Text style={styles.sectionLink}>Abrir</Text>
                </TouchableOpacity>
              </View>
              {latestMessages.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Mail size={20} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Você ainda não possui recados.</Text>
                </View>
              ) : (
                latestMessages.map((message) => (
                  <TouchableOpacity
                    key={message.conversa_id || message.id}
                    style={styles.listCard}
                    onPress={() =>
                      router.push({
                        pathname: '/message-detail',
                        params: {
                          ...(message.conversa_id ? { conversaId: message.conversa_id } : {}),
                          ...(message.id ? { messageId: message.id } : {}),
                        },
                      })
                    }
                  >
                    <View style={styles.listCardLeft}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {message.titulo || message.ultima_mensagem?.titulo || 'Conversa'}
                      </Text>
                      <Text style={styles.listSubtitle} numberOfLines={2}>
                        {message.conteudo || message.ultima_mensagem?.conteudo || ''}
                      </Text>
                    </View>
                    <View style={styles.messageMeta}>
                      {(message.unread_count ?? (message.lida ? 0 : 1)) > 0 && (
                        <PulsingDot size={8} />
                      )}
                      <Text style={styles.listDate}>
                        {formatDate(
                          message.updated_at ||
                            message.ultima_mensagem?.created_at ||
                            message.created_at ||
                            ''
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav />

      <View
        pointerEvents={isRefreshingManually ? 'auto' : 'none'}
        style={[styles.overlay, !isRefreshingManually && styles.hidden]}
      >
        <View style={styles.overlayCard}>
          <LoadingSquares squareSize={18} gap={8} />
          <Text style={styles.overlayText}>Atualizando página...</Text>
        </View>
      </View>

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        isLoggingOut={isLoggingOut}
        userName={user?.nome_completo}
        onCancel={() => {
          if (!isLoggingOut) setShowLogoutConfirm(false);
        }}
        onConfirm={confirmLogout}
      />
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
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 48,
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSchoolLogoFrame: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  headerSchoolLogo: {
    width: 32,
    height: 32,
  },
  headerBrandDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  headerEdullyBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEdullyLogo: {
    width: 86,
    height: 28,
  },
  headerWordmark: {
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.32)',
    gap: 1,
  },
  headerWordmarkLine: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    lineHeight: 13,
  },
  headerWordmarkLineAccent: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    lineHeight: 14,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    position: 'relative',
  },
  headerPulseBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  teacherIdentityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 82,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: Colors.white,
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  teacherIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  teacherEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  teacherSchool: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  welcomeBlock: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  welcomeGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  welcomeDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  focusPill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  focusPillAlert: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  focusPillCalm: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  focusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  focusDotAlert: {
    backgroundColor: Colors.primary,
  },
  focusDotCalm: {
    backgroundColor: Colors.success,
  },
  focusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  focusTextAlert: {
    color: '#1e3a8a',
  },
  focusTextCalm: {
    color: '#166534',
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
  metricAttentionDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
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
    fontWeight: '500',
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
  avisoCardNew: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
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

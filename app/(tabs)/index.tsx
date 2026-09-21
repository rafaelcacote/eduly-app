import BottomNav from '@/components/BottomNav';
import { ExerciseTeacherRow } from '@/components/ExerciseTeacher';
import { LoadingSquares } from '@/components/loading-squares';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { PulsingDot } from '@/components/PulsingDot';
import { StudentAvatar } from '@/components/StudentAvatar';
import { MESSAGE_TYPE_LABELS } from '@/components/TypeIcon';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Aviso, avisosService } from '@/services/avisos';
import {
  Exercise,
  exercisesService,
  getExerciseDisciplineName,
} from '@/services/exercises';
import { Conversation, messagesService } from '@/services/messages';
import { Student } from '@/services/students';
import { Test, testsService } from '@/services/tests';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  LogOut,
  MessageSquare,
  RefreshCw,
  Wallet,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** true = Documentos/Financeiro em quadrados; false = faixas horizontais (layout anterior). */
const HOME_SERVICES_AS_SQUARES = true;

export default function Home() {
  const router = useRouter();
  const { logout, isAuthenticated, user, isLoading: isLoadingAuth } = useAuth();
  const { students, selectedStudent, isLoading: isLoadingStudents, setSelectedStudent } = useStudent();
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isRefreshingManually, setIsRefreshingManually] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [lastSeenAvisosAt, setLastSeenAvisosAt] = useState<string | null>(null);
  const [seenExerciseIds, setSeenExerciseIds] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [schoolLogoFailed, setSchoolLogoFailed] = useState(false);
  const hasLoadedDashboardOnce = useRef(false);

  const schoolName = selectedStudent?.school?.nome || null;
  const schoolLogoUrl = useMemo(
    () => resolveMediaUrl(selectedStudent?.school?.logo_url),
    [selectedStudent?.school?.logo_url]
  );

  useEffect(() => {
    setSchoolLogoFailed(false);
  }, [schoolLogoUrl]);

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

  const studentName = selectedStudent
    ? selectedStudent.nome_social || selectedStudent.nome
    : '';
  const studentTurma = selectedStudent?.turmas?.[0]
    ? `${selectedStudent.turmas[0].serie} ${selectedStudent.turmas[0].turma_letra}`
    : '';

  const renderStudentIdentity = (tappable: boolean) => {
    const content = (
      <>
        <StudentAvatar
          nome={studentName || 'Aluno'}
          fotoUrl={selectedStudent?.foto_url}
          size="lg"
        />
        <View style={styles.studentIdentityText}>
          <Text style={styles.studentEyebrow}>Agenda de</Text>
          <Text style={styles.studentName} numberOfLines={1}>
            {studentName || 'Carregando...'}
          </Text>
          {!!studentTurma && (
            <Text style={styles.studentTurma} numberOfLines={1}>
              {studentTurma}
              {schoolName ? `  ·  ${schoolName}` : ''}
            </Text>
          )}
        </View>
        {tappable && (
          <View style={styles.studentChevron}>
            <ChevronDown size={18} color={Colors.primary} strokeWidth={2.5} />
          </View>
        )}
      </>
    );

    if (tappable) {
      return (
        <TouchableOpacity
          style={styles.studentSelector}
          onPress={() => setShowStudentSelector(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Aluno selecionado: ${getStudentDisplayText(selectedStudent)}. Toque para trocar.`}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={styles.studentSelector}>{content}</View>;
  };

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
        window.alert('Não foi possível fazer logout. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
      }
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!selectedStudent?.id) {
      setMessages([]);
      setAvisos([]);
      setExercises([]);
      setTests([]);
      return;
    }

    try {
      const [messagesData, exercisesData, testsData, lastSeen, seenExerciseIdsData] = await Promise.all([
        messagesService.getMessages({ aluno_id: selectedStudent.id }),
        exercisesService.getExercises({ aluno_id: selectedStudent.id }),
        testsService.getTests({ aluno_id: selectedStudent.id }),
        avisosService.getLastSeenAvisosAt(),
        exercisesService.getSeenExerciseIds(),
      ]);

      setMessages(messagesData);
      setExercises(exercisesData);
      setTests(testsData);
      setLastSeenAvisosAt(lastSeen);
      setSeenExerciseIds(seenExerciseIdsData);

      // Avisos em paralelo (não bloqueia o painel se 403)
      avisosService.getAvisos({ page: 1 }).then((res) => setAvisos(res.avisos)).catch(() => setAvisos([]));
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível carregar o painel.');
    }
  }, [selectedStudent?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || user?.type === 'teacher' || isLoadingStudents) return;

      let cancelled = false;
      const load = async () => {
        const showLoading = !hasLoadedDashboardOnce.current;
        if (showLoading) setIsLoadingDashboard(true);
        await loadDashboardData();
        if (!cancelled) {
          hasLoadedDashboardOnce.current = true;
          setIsLoadingDashboard(false);
        }
      };
      load();

      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, user?.type, isLoadingStudents, loadDashboardData])
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

  type RecentItem = { type: 'message'; data: Conversation } | { type: 'aviso'; data: Aviso };

  const PREVIEW_LIMIT = 3;

  const recentMessagesAndAvisos = useMemo((): RecentItem[] => {
    const messageItems: RecentItem[] = messages.map((m) => ({ type: 'message' as const, data: m }));
    const avisoItems: RecentItem[] = avisos.map((a) => ({ type: 'aviso' as const, data: a }));
    return [...messageItems, ...avisoItems]
      .sort((a, b) => {
        const dateA =
          a.type === 'message'
            ? new Date(a.data.updated_at || a.data.created_at || a.data.ultima_mensagem?.created_at || 0).getTime()
            : new Date(a.data.publicado_em || a.data.created_at).getTime();
        const dateB =
          b.type === 'message'
            ? new Date(b.data.updated_at || b.data.created_at || b.data.ultima_mensagem?.created_at || 0).getTime()
            : new Date(b.data.publicado_em || b.data.created_at).getTime();
        return dateB - dateA;
      })
      .slice(0, PREVIEW_LIMIT);
  }, [messages, avisos]);

  const hasNewAvisos = useMemo(
    () => avisos.some((a) => avisosService.isAvisoNew(a, lastSeenAvisosAt)),
    [avisos, lastSeenAvisosAt]
  );

  const newAvisosCount = useMemo(
    () => avisos.filter((a) => avisosService.isAvisoNew(a, lastSeenAvisosAt)).length,
    [avisos, lastSeenAvisosAt]
  );

  const recentExercises = useMemo(
    () =>
      [...exercises]
        .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
        .slice(0, PREVIEW_LIMIT),
    [exercises]
  );

  const upcomingTestsAll = useMemo(
    () =>
      [...tests]
        .filter((test) => new Date(test.data_prova).getTime() >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => new Date(a.data_prova).getTime() - new Date(b.data_prova).getTime()),
    [tests]
  );

  const upcomingTests = useMemo(
    () => upcomingTestsAll.slice(0, PREVIEW_LIMIT),
    [upcomingTestsAll]
  );

  const unreadMessages = useMemo(
    () => messages.reduce((total, msg) => total + (msg.unread_count ?? (msg.lida ? 0 : 1)), 0),
    [messages]
  );

  const newExercisesCount = useMemo(
    () => exercises.filter((item) => exercisesService.isExerciseNew(item, seenExerciseIds)).length,
    [exercises, seenExerciseIds]
  );

  const communicationAttentionCount = unreadMessages + newAvisosCount;

  const firstName = useMemo(() => {
    const full = user?.nome_completo?.trim();
    if (!full) return 'Responsável';
    return full.split(/\s+/)[0];
  }, [user?.nome_completo]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'amanhã';
    if (diffDays > 1 && diffDays <= 7) return `em ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const focusSummary = useMemo(() => {
    const parts: string[] = [];
    if (communicationAttentionCount > 0) {
      parts.push(
        communicationAttentionCount === 1
          ? '1 comunicação nova'
          : `${communicationAttentionCount} comunicações novas`
      );
    }
    if (newExercisesCount > 0) {
      parts.push(
        newExercisesCount === 1 ? '1 exercício novo' : `${newExercisesCount} exercícios novos`
      );
    }
    if (upcomingTestsAll[0]) {
      parts.push(`próxima prova ${formatShortDate(upcomingTestsAll[0].data_prova)}`);
    }
    if (parts.length === 0) {
      return 'Nada urgente por agora — agenda em dia.';
    }
    return parts.join(' · ');
  }, [communicationAttentionCount, newExercisesCount, upcomingTestsAll]);

  const hasAttention =
    communicationAttentionCount > 0 || newExercisesCount > 0 || upcomingTestsAll.length > 0;

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#12358f', '#3155c6'] as [string, string]}
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
              style={styles.iconButton}
              onPress={() => router.push('/messages')}
              accessibilityLabel="Abrir comunicação"
            >
              <Bell size={18} color={Colors.white} />
              {(unreadMessages > 0 || hasNewAvisos) ? (
                <PulsingDot size={8} style={styles.headerPulseBadge} />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleManualRefresh}
              accessibilityLabel="Atualizar painel"
            >
              <RefreshCw size={18} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleLogout}
              accessibilityLabel="Sair do aplicativo"
            >
              <LogOut size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        {isLoadingStudents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.textMuted} />
            <Text style={styles.headerSubtitle}>Carregando...</Text>
          </View>
        ) : (
          renderStudentIdentity(students.length > 1)
        )}
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
          <View
            style={[
              styles.focusPill,
              hasAttention ? styles.focusPillAlert : styles.focusPillCalm,
            ]}
          >
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
              {isLoadingDashboard ? 'Carregando a agenda...' : focusSummary}
            </Text>
          </View>
        </View>

        {/*
          HOME_SERVICES_AS_SQUARES: true = Documentos/Financeiro em quadrados (nova UI).
          false = atalhos em faixa horizontal (layout anterior). Troque o flag para voltar.
        */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push('/messages')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir comunicação"
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff' }]}>
              <MessageSquare size={18} color={Colors.primary} />
            </View>
            <Text style={styles.metricValue}>
              {isLoadingDashboard ? '—' : communicationAttentionCount}
            </Text>
            <Text style={styles.metricLabel}>Novos</Text>
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
            <Text style={styles.metricValue}>
              {isLoadingDashboard ? '—' : newExercisesCount > 0 ? newExercisesCount : exercises.length}
            </Text>
            <Text style={styles.metricLabel}>
              {newExercisesCount > 0 ? 'Novos' : 'Exercícios'}
            </Text>
            {newExercisesCount > 0 && <View style={styles.metricAttentionDot} />}
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
            <Text style={styles.metricValue}>
              {isLoadingDashboard ? '—' : upcomingTestsAll.length}
            </Text>
            <Text style={styles.metricLabel}>Provas</Text>
          </TouchableOpacity>
        </View>

        {HOME_SERVICES_AS_SQUARES ? (
          <View style={styles.servicesGrid}>
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => router.push('/documentos')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Abrir documentos"
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff' }]}>
                <FileText size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.serviceTitle}>Documentos</Text>
              <Text style={styles.serviceHint} numberOfLines={2}>
                Atestados e declarações
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => router.push('/financeiro')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Abrir financeiro"
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5' }]}>
                <Wallet size={18} color={Colors.success} />
              </View>
              <Text style={styles.serviceTitle}>Financeiro</Text>
              <Text style={styles.serviceHint} numberOfLines={2}>
                Boletos e PIX
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.documentosShortcut}
              onPress={() => router.push('/documentos')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Abrir documentos"
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#e0e7ff' }]}>
                <FileText size={18} color={Colors.secondary} />
              </View>
              <View style={styles.documentosShortcutText}>
                <Text style={styles.documentosShortcutTitle}>Documentos</Text>
                <Text style={styles.documentosShortcutHint}>
                  Atestados, declarações e arquivos da escola
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.documentosShortcut, styles.documentosShortcutLast]}
              onPress={() => router.push('/financeiro')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Abrir financeiro"
            >
              <View style={[styles.metricIconWrap, { backgroundColor: '#d1fae5' }]}>
                <Wallet size={18} color={Colors.success} />
              </View>
              <View style={styles.documentosShortcutText}>
                <Text style={styles.documentosShortcutTitle}>Financeiro</Text>
                <Text style={styles.documentosShortcutHint}>
                  Mensalidades, boletos e PIX do aluno
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Próximas provas</Text>
            <TouchableOpacity onPress={() => router.push('/exams')}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>
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
                <TouchableOpacity
                  key={test.id}
                  style={styles.eventCard}
                  onPress={() => router.push('/exams')}
                  activeOpacity={0.72}
                >
                  <View style={[styles.eventDate, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.eventDateText, { color: '#dc2626' }]}>
                      {new Date(test.data_prova).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {test.titulo}
                    </Text>
                    <Text style={styles.eventSubtitle} numberOfLines={1}>
                      {test.disciplina?.nome || 'Disciplina'} · {formatShortDate(test.data_prova)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Próximas entregas de exercícios</Text>
            <TouchableOpacity onPress={() => router.push('/exercises')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsList}>
            {isLoadingDashboard ? (
              <View style={styles.emptyContainer}>
                <LoadingSquares squareSize={16} gap={6} />
              </View>
            ) : recentExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma entrega próxima</Text>
              </View>
            ) : (
              recentExercises.map((exercise) => {
                const isNew = exercisesService.isExerciseNew(exercise, seenExerciseIds);
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseHomeCard, isNew && styles.eventCardNew]}
                    onPress={() =>
                      router.push({
                        pathname: '/exercise-detail',
                        params: { exerciseId: exercise.id },
                      })
                    }
                    activeOpacity={0.72}
                  >
                    <ExerciseTeacherRow exercise={exercise} />
                    <View style={styles.eventTitleRow}>
                      <Text
                        style={[styles.eventTitle, isNew && styles.eventTitleNew]}
                        numberOfLines={1}
                      >
                        {exercise.titulo}
                      </Text>
                      {isNew && (
                        <>
                          <PulsingDot size={8} />
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>Novo</Text>
                          </View>
                        </>
                      )}
                    </View>
                    <Text style={styles.eventSubtitle} numberOfLines={1}>
                      {getExerciseDisciplineName(exercise)} · Entrega{' '}
                      {formatRelativeDate(exercise.data_entrega)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Comunicação</Text>
            <TouchableOpacity onPress={() => router.push('/messages')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.messagesList}>
            {isLoadingDashboard ? (
              <View style={styles.emptyContainer}>
                <LoadingSquares squareSize={16} gap={6} />
              </View>
            ) : recentMessagesAndAvisos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum recado ou comunicado recente</Text>
              </View>
            ) : (
              recentMessagesAndAvisos.map((item) =>
                item.type === 'message' ? (
                  <TouchableOpacity
                    key={`msg-${item.data.conversa_id || item.data.id}`}
                    style={styles.messageCard}
                    onPress={() =>
                      router.push({
                        pathname: '/message-detail',
                        params: {
                          ...(item.data.conversa_id
                            ? { conversaId: item.data.conversa_id }
                            : {}),
                          ...(item.data.id ? { messageId: item.data.id } : {}),
                        },
                      })
                    }
                    activeOpacity={0.72}
                  >
                    <View style={styles.messageContent}>
                      <View style={styles.messageTitleRow}>
                        <View style={styles.channelChip}>
                          <Text style={styles.channelChipText}>
                            {(item.data.messages_count || 1) > 1 ? 'Conversa' : 'Recado'}
                          </Text>
                        </View>
                        {(item.data.unread_count ?? (item.data.lida ? 0 : 1)) > 0 && (
                          <PulsingDot size={8} />
                        )}
                      </View>
                      <Text style={styles.messageTitle} numberOfLines={1}>
                        {item.data.titulo || item.data.ultima_mensagem?.titulo || 'Conversa'}
                      </Text>
                      <Text style={styles.messageSubtitle} numberOfLines={1}>
                        {item.data.remetente?.nome_completo ||
                          item.data.ultima_mensagem?.remetente?.nome_completo ||
                          (item.data.tipo
                            ? MESSAGE_TYPE_LABELS[item.data.tipo] ?? item.data.tipo
                            : 'Mensagem')}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>
                      {formatRelativeDate(
                        item.data.updated_at ||
                          item.data.ultima_mensagem?.created_at ||
                          item.data.created_at ||
                          new Date().toISOString()
                      )}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={`aviso-${item.data.id}`}
                    style={[styles.messageCard, styles.comunicadoCardHome]}
                    onPress={() =>
                      router.push({
                        pathname: '/aviso-detail',
                        params: { avisoId: item.data.id },
                      })
                    }
                    activeOpacity={0.72}
                  >
                    <View style={styles.messageContent}>
                      <View style={styles.messageTitleRow}>
                        <View style={[styles.channelChip, styles.channelChipComunicado]}>
                          <Text style={[styles.channelChipText, styles.channelChipTextComunicado]}>
                            Comunicado
                          </Text>
                        </View>
                        {avisosService.isAvisoNew(item.data, lastSeenAvisosAt) && (
                          <>
                            <PulsingDot size={8} color="#0f766e" />
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>Novo</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <Text style={styles.messageTitle} numberOfLines={1}>
                        {item.data.titulo}
                      </Text>
                      <Text style={styles.messageSubtitle} numberOfLines={1}>
                        {item.data.criado_por?.nome_completo ||
                          item.data.tenant?.nome ||
                          'Toda a escola'}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>
                      {formatRelativeDate(item.data.publicado_em || item.data.created_at)}
                    </Text>
                  </TouchableOpacity>
                )
              )
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
                    <StudentAvatar
                      nome={nome}
                      fotoUrl={student.foto_url}
                      size="md"
                      ring={isSelected}
                    />
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

      {/* Overlay de loading ao atualizar */}
      <Modal
        visible={isRefreshingManually}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <LoadingSquares squareSize={20} gap={8} />
            <Text style={styles.loadingText}>Atualizando painel...</Text>
          </View>
        </View>
      </Modal>

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
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 14,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
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
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centeredLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentSelector: {
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
  studentIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  studentEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  studentTurma: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 3,
  },
  studentChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  headerPulseBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeBlock: {
    marginBottom: 16,
    gap: 10,
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  focusPillAlert: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  focusPillCalm: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  focusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  focusDotAlert: {
    backgroundColor: '#ea580c',
  },
  focusDotCalm: {
    backgroundColor: '#059669',
  },
  focusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  focusTextAlert: {
    color: '#9a3412',
  },
  focusTextCalm: {
    color: '#065f46',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
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
  servicesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  serviceHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  documentosShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  documentosShortcutLast: {
    marginBottom: 22,
  },
  documentosShortcutText: {
    flex: 1,
    gap: 2,
  },
  documentosShortcutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  documentosShortcutHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionTitleInHeader: {
    marginBottom: 0,
  },
  messagesList: {
    gap: 8,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comunicadoCardHome: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  messageIcon: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  channelChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelChipComunicado: {
    backgroundColor: '#ccfbf1',
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  channelChipTextComunicado: {
    color: '#0f766e',
  },
  unreadDotHome: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  newBadge: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    textTransform: 'uppercase',
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseHomeCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardNew: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary + '33',
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
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flexShrink: 1,
  },
  eventTitleNew: {
    fontWeight: '700',
  },
  eventSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
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
    gap: 12,
  },
  studentOptionSelected: {
    backgroundColor: Colors.background,
  },
  studentOptionContent: {
    flex: 1,
    minWidth: 0,
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

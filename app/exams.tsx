import { AppHeader, AppHeaderAction } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import Calendar from '@/components/Calendar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Test, testsService } from '@/services/tests';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  Edit,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TestStatus = 'upcoming' | 'today' | 'past';

interface TestWithStatus extends Test {
  status: TestStatus;
}

function parseLocalDate(dateString: string): Date {
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
    }
  }

  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
  }

  return new Date(dateString);
}

function calculateStatus(test: Test): TestStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const testDate = parseLocalDate(test.data_prova);
  testDate.setHours(0, 0, 0, 0);

  if (testDate.getTime() === today.getTime()) return 'today';
  if (testDate < today) return 'past';
  return 'upcoming';
}

function formatTimeRange(test: Test): string | null {
  if (!test.horario) return null;

  if (!test.duracao_minutos) return test.horario;

  const [hours, minutes] = test.horario.split(':');
  const startTime = new Date();
  startTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + test.duracao_minutos);

  const endHours = endTime.getHours().toString().padStart(2, '0');
  const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

  return `${test.horario} – ${endHours}:${endMinutes}`;
}

function getTurmaLabel(test: Test): string {
  if (test.turma.serie && test.turma.turma_letra) {
    return `${test.turma.serie} ${test.turma.turma_letra}`;
  }
  return test.turma.nome;
}

function getStatusMeta(status: TestStatus) {
  if (status === 'today') {
    return { label: 'Hoje', bg: '#fef3c7', color: '#b45309' };
  }
  if (status === 'past') {
    return { label: 'Realizada', bg: '#f3f4f6', color: '#6b7280' };
  }
  return { label: 'Próxima', bg: '#dbeafe', color: Colors.primary };
}

export default function Exams() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedStudent } = useStudent();
  const [tests, setTests] = useState<TestWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedTest, setSelectedTest] = useState<TestWithStatus | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterByDay, setFilterByDay] = useState(false);

  const isTeacher = user?.type === 'teacher';

  const loadTests = useCallback(async () => {
    try {
      setError(null);
      const params: { aluno_id?: string } = {};

      if (!isTeacher && selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const data = await testsService.getTests(params);
      const testsWithStatus: TestWithStatus[] = data
        .map((test) => ({
          ...test,
          status: calculateStatus(test),
        }))
        .sort(
          (a, b) =>
            parseLocalDate(a.data_prova).getTime() - parseLocalDate(b.data_prova).getTime()
        );

      setTests(testsWithStatus);
    } catch (err: any) {
      console.error('Erro ao carregar provas:', err);
      setError(err.message || 'Erro ao carregar provas');
      setTests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isTeacher, selectedStudent]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTests();
  }, [loadTests]);

  const examDays = useMemo(() => {
    const selectedMonthIndex = selectedMonth.getMonth();
    const selectedYear = selectedMonth.getFullYear();
    const days: number[] = [];

    tests.forEach((test) => {
      const testDate = parseLocalDate(test.data_prova);
      if (testDate.getMonth() === selectedMonthIndex && testDate.getFullYear() === selectedYear) {
        days.push(testDate.getDate());
      }
    });

    return days;
  }, [tests, selectedMonth]);

  const testsForSelectedMonth = useMemo(() => {
    const selectedMonthIndex = selectedMonth.getMonth();
    const selectedYear = selectedMonth.getFullYear();

    return tests.filter((test) => {
      const testDate = parseLocalDate(test.data_prova);
      if (testDate.getMonth() !== selectedMonthIndex || testDate.getFullYear() !== selectedYear) {
        return false;
      }
      if (filterByDay && selectedDay !== null) {
        return testDate.getDate() === selectedDay;
      }
      return true;
    });
  }, [tests, selectedMonth, filterByDay, selectedDay]);

  const handleDayPress = (day: number) => {
    if (filterByDay && selectedDay === day) {
      setFilterByDay(false);
      setSelectedDay(null);
      return;
    }
    setFilterByDay(true);
    setSelectedDay(day);
  };

  const handleShowAllMonth = () => {
    setFilterByDay(false);
    setSelectedDay(null);
  };

  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date);
    setSelectedDay(null);
    setFilterByDay(false);
  };

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    Alert.alert('Excluir prova', `Tem certeza que deseja excluir "${testTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await testsService.deleteTest(testId);
            setSelectedTest(null);
            await loadTests();
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Erro ao excluir prova');
          }
        },
      },
    ]);
  };

  const handleCreateTest = () => {
    router.push('/create-exam');
  };

  const handleEditTest = (test: Test) => {
    setSelectedTest(null);
    router.push({
      pathname: '/create-exam',
      params: { testId: test.id },
    });
  };

  const sectionTitle = useMemo(() => {
    if (filterByDay && selectedDay !== null) {
      return `Provas do dia ${selectedDay}`;
    }
    if (testsForSelectedMonth.length > 0) {
      const monthName = selectedMonth.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });
      return `Provas de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    }
    return 'Provas';
  }, [filterByDay, selectedDay, testsForSelectedMonth.length, selectedMonth]);

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <AppHeader title="Provas" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando provas...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Provas"
        right={
          isTeacher ? (
            <AppHeaderAction onPress={handleCreateTest} accessibilityLabel="Criar prova">
              <Plus size={20} color={Colors.white} />
            </AppHeaderAction>
          ) : undefined
        }
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadTests} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Calendar
          selectedDate={selectedMonth}
          onDateChange={handleMonthChange}
          markedDates={examDays}
          onDayPress={handleDayPress}
          selectedDay={filterByDay ? selectedDay : null}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {filterByDay && selectedDay !== null ? (
            <TouchableOpacity onPress={handleShowAllMonth} style={styles.filterButton}>
              <Text style={styles.filterButtonText}>Ver mês</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {tests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma prova encontrada</Text>
            <Text style={styles.emptySubtext}>
              {isTeacher
                ? 'Crie uma nova prova usando o botão + no topo'
                : 'Não há provas agendadas no momento'}
            </Text>
          </View>
        ) : testsForSelectedMonth.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {filterByDay && selectedDay !== null
                ? `Nenhuma prova no dia ${selectedDay}`
                : 'Nenhuma prova neste mês'}
            </Text>
            <Text style={styles.emptySubtext}>
              {filterByDay && selectedDay !== null
                ? 'Selecione outro dia ou veja todas do mês'
                : 'Navegue pelos meses para ver outras provas'}
            </Text>
          </View>
        ) : (
          testsForSelectedMonth.map((test) => {
            const date = parseLocalDate(test.data_prova);
            const dayNum = date.getDate().toString().padStart(2, '0');
            const monthShort = date
              .toLocaleDateString('pt-BR', { month: 'short' })
              .replace('.', '');
            const timeRange = formatTimeRange(test);
            const status = getStatusMeta(test.status);
            const metaParts = [
              test.disciplina?.nome,
              timeRange,
              test.sala ? `Sala ${test.sala}` : null,
            ].filter(Boolean);

            return (
              <TouchableOpacity
                key={test.id}
                style={[styles.examCard, test.status === 'today' && styles.examCardToday]}
                onPress={() => setSelectedTest(test)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={`${test.titulo}. Toque para ver detalhes`}
              >
                <View
                  style={[
                    styles.dateBadge,
                    test.status === 'today' && styles.dateBadgeToday,
                    test.status === 'past' && styles.dateBadgePast,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      test.status === 'today' && styles.dateDayToday,
                      test.status === 'past' && styles.dateDayPast,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      test.status === 'today' && styles.dateMonthToday,
                      test.status === 'past' && styles.dateMonthPast,
                    ]}
                  >
                    {monthShort}
                  </Text>
                </View>

                <View style={styles.examBody}>
                  <View style={styles.examTitleRow}>
                    <Text style={styles.examTitle} numberOfLines={2}>
                      {test.titulo}
                    </Text>
                    {test.status === 'today' ? (
                      <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusChipText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.examMeta} numberOfLines={1}>
                    {metaParts.join(' · ')}
                  </Text>

                  {!!test.descricao?.trim() && (
                    <Text style={styles.examHint} numberOfLines={1}>
                      {test.descricao.trim()}
                    </Text>
                  )}
                </View>

                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomNav />

      <Modal
        visible={selectedTest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTest(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedTest(null)} />

          {selectedTest ? (
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderText}>
                  <View style={styles.sheetBadges}>
                    {(() => {
                      const status = getStatusMeta(selectedTest.status);
                      return (
                        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusChipText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.sheetDiscipline} numberOfLines={1}>
                      {selectedTest.disciplina.nome}
                    </Text>
                  </View>
                  <Text style={styles.sheetTitle}>{selectedTest.titulo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedTest(null)}
                  style={styles.sheetClose}
                  accessibilityLabel="Fechar"
                >
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.factGrid}>
                  <View style={styles.factCard}>
                    <CalendarIcon size={16} color={Colors.primary} />
                    <Text style={styles.factLabel}>Data</Text>
                    <Text style={styles.factValue}>
                      {selectedTest.data_prova_formatted ||
                        parseLocalDate(selectedTest.data_prova).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                    </Text>
                  </View>

                  <View style={styles.factCard}>
                    <Clock size={16} color={Colors.primary} />
                    <Text style={styles.factLabel}>Horário</Text>
                    <Text style={styles.factValue}>
                      {formatTimeRange(selectedTest) || 'Não informado'}
                    </Text>
                  </View>

                  <View style={styles.factCard}>
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.factLabel}>Sala</Text>
                    <Text style={styles.factValue}>{selectedTest.sala || '—'}</Text>
                  </View>

                  <View style={styles.factCard}>
                    <Clock size={16} color={Colors.primary} />
                    <Text style={styles.factLabel}>Duração</Text>
                    <Text style={styles.factValue}>
                      {selectedTest.duracao_minutos
                        ? `${selectedTest.duracao_minutos} min`
                        : '—'}
                    </Text>
                  </View>
                </View>

                {!!selectedTest.descricao?.trim() && (
                  <View style={styles.descBlock}>
                    <Text style={styles.descTitle}>Sobre a prova</Text>
                    <Text style={styles.descBody}>{selectedTest.descricao.trim()}</Text>
                  </View>
                )}

                <View style={styles.peopleBlock}>
                  <View style={styles.peopleRow}>
                    <View style={styles.peopleIcon}>
                      <BookOpen size={16} color={Colors.primary} />
                    </View>
                    <View style={styles.peopleText}>
                      <Text style={styles.peopleLabel}>Disciplina</Text>
                      <Text style={styles.peopleValue}>{selectedTest.disciplina.nome}</Text>
                    </View>
                  </View>
                  <View style={styles.peopleRow}>
                    <View style={styles.peopleIcon}>
                      <Users size={16} color={Colors.primary} />
                    </View>
                    <View style={styles.peopleText}>
                      <Text style={styles.peopleLabel}>Turma</Text>
                      <Text style={styles.peopleValue}>{getTurmaLabel(selectedTest)}</Text>
                    </View>
                  </View>
                  <View style={styles.peopleRow}>
                    <View style={styles.peopleIcon}>
                      <User size={16} color={Colors.primary} />
                    </View>
                    <View style={styles.peopleText}>
                      <Text style={styles.peopleLabel}>Professor</Text>
                      <Text style={styles.peopleValue}>
                        {selectedTest.professor.usuario.nome_completo}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {isTeacher ? (
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    onPress={() => handleEditTest(selectedTest)}
                    style={styles.sheetActionPrimary}
                  >
                    <Edit size={16} color={Colors.white} />
                    <Text style={styles.sheetActionPrimaryText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTest(selectedTest.id, selectedTest.titulo)}
                    style={styles.sheetActionDanger}
                  >
                    <Trash2 size={16} color={Colors.error} />
                    <Text style={styles.sheetActionDangerText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  examCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examCardToday: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  dateBadge: {
    width: 52,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeToday: {
    backgroundColor: '#fef3c7',
  },
  dateBadgePast: {
    backgroundColor: '#f3f4f6',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dc2626',
    lineHeight: 22,
  },
  dateDayToday: {
    color: '#b45309',
  },
  dateDayPast: {
    color: '#6b7280',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  dateMonthToday: {
    color: '#b45309',
  },
  dateMonthPast: {
    color: '#6b7280',
  },
  examBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  examTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  examMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  examHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  sheetBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetDiscipline: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 16,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  factCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  factValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  descBlock: {
    gap: 8,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  descBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  peopleBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    marginBottom: 4,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  peopleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleText: {
    flex: 1,
    minWidth: 0,
  },
  peopleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  peopleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 1,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sheetActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
  },
  sheetActionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  sheetActionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  sheetActionDangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
});

import BottomNav from '@/components/BottomNav';
import Calendar from '@/components/Calendar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Test, testsService } from '@/services/tests';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Calendar as CalendarIcon, Clock, Edit, MapPin, Plus, Trash2, User, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TestStatus = 'upcoming' | 'today' | 'past';

interface TestWithStatus extends Test {
  status: TestStatus;
}

export default function Exams() {
  const router = useRouter();
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

  /**
   * Parse uma data no formato YYYY-MM-DD como data local (não UTC)
   * Isso evita problemas de timezone onde uma data pode aparecer como dia anterior
   */
  const parseLocalDate = (dateString: string): Date => {
    // Se já vier formatada (DD/MM/YYYY), tenta parsear
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }

    // Para formato YYYY-MM-DD, parse manualmente para evitar timezone
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    // Fallback para o método padrão
    return new Date(dateString);
  };

  /**
   * Calcula o status da prova baseado na data
   */
  const calculateStatus = (test: Test): TestStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const testDate = parseLocalDate(test.data_prova);
    testDate.setHours(0, 0, 0, 0);

    if (testDate.getTime() === today.getTime()) {
      return 'today';
    }

    if (testDate < today) {
      return 'past';
    }

    return 'upcoming';
  };

  /**
   * Carrega provas da API
   */
  const loadTests = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};

      // Se for responsável, filtra por aluno selecionado
      if (!isTeacher && selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const data = await testsService.getTests(params);

      // Adiciona status calculado a cada prova
      const testsWithStatus: TestWithStatus[] = data.map(test => ({
        ...test,
        status: calculateStatus(test),
      }));

      // Ordena por data (mais próximas primeiro)
      testsWithStatus.sort((a, b) => {
        const dateA = parseLocalDate(a.data_prova).getTime();
        const dateB = parseLocalDate(b.data_prova).getTime();
        return dateA - dateB;
      });

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

  /**
   * Carrega provas ao montar o componente
   */
  useEffect(() => {
    loadTests();
  }, [loadTests]);

  /**
   * Atualiza lista ao puxar para baixo
   */
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTests();
  }, [loadTests]);

  /**
   * Formata data para exibição
   */
  const formatDate = (dateString: string): string => {
    try {
      // Se já vier formatada da API (data_prova_formatted), usa ela
      if (dateString.includes('/')) {
        return dateString;
      }

      const date = parseLocalDate(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  };

  /**
   * Formata horário e duração
   */
  const formatTimeRange = (test: Test): string => {
    if (!test.horario) {
      return 'Horário não informado';
    }

    if (!test.duracao_minutos) {
      return test.horario;
    }

    const [hours, minutes] = test.horario.split(':');
    const startTime = new Date();
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + test.duracao_minutos);

    const endHours = endTime.getHours().toString().padStart(2, '0');
    const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

    return `${test.horario} - ${endHours}:${endMinutes}`;
  };

  /**
   * Obtém os dias do mês selecionado que têm provas para o calendário
   */
  const getExamDays = (): number[] => {
    const examDays: number[] = [];
    const selectedMonthIndex = selectedMonth.getMonth();
    const selectedYear = selectedMonth.getFullYear();

    tests.forEach(test => {
      const testDate = parseLocalDate(test.data_prova);
      if (testDate.getMonth() === selectedMonthIndex && testDate.getFullYear() === selectedYear) {
        examDays.push(testDate.getDate());
      }
    });

    return examDays;
  };

  /**
   * Filtra provas do mês selecionado e opcionalmente por dia
   */
  const getTestsForSelectedMonth = (): TestWithStatus[] => {
    const selectedMonthIndex = selectedMonth.getMonth();
    const selectedYear = selectedMonth.getFullYear();

    let filteredTests = tests.filter(test => {
      const testDate = parseLocalDate(test.data_prova);
      return testDate.getMonth() === selectedMonthIndex && testDate.getFullYear() === selectedYear;
    });

    // Se estiver filtrando por dia, aplica o filtro adicional
    if (filterByDay && selectedDay !== null) {
      filteredTests = filteredTests.filter(test => {
        const testDate = parseLocalDate(test.data_prova);
        return testDate.getDate() === selectedDay;
      });
    }

    return filteredTests;
  };

  /**
   * Manipula o clique em um dia do calendário
   */
  const handleDayPress = (day: number) => {
    if (filterByDay && selectedDay === day) {
      // Se clicar no mesmo dia, desativa o filtro
      setFilterByDay(false);
      setSelectedDay(null);
    } else {
      // Ativa o filtro e seleciona o dia
      setFilterByDay(true);
      setSelectedDay(day);
    }
  };

  /**
   * Desativa o filtro por dia e mostra todas as provas do mês
   */
  const handleShowAllMonth = () => {
    setFilterByDay(false);
    setSelectedDay(null);
  };

  /**
   * Quando o mês muda, reseta o filtro por dia
   */
  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date);
    setSelectedDay(null);
    setFilterByDay(false);
  };

  /**
   * Deleta uma prova (apenas professores)
   */
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir a prova "${testTitle}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await testsService.deleteTest(testId);
              await loadTests();
              Alert.alert('Sucesso', 'Prova excluída com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao excluir prova');
            }
          },
        },
      ]
    );
  };

  /**
   * Navega para tela de criar prova
   */
  const handleCreateTest = () => {
    router.push('/create-exam');
  };

  /**
   * Navega para tela de editar prova
   */
  const handleEditTest = (test: Test) => {
    router.push({
      pathname: '/create-exam',
      params: { testId: test.id },
    });
  };

  /**
   * Abre modal com detalhes da prova
   */
  const handleViewTest = (test: TestWithStatus) => {
    setSelectedTest(test);
  };

  /**
   * Fecha o modal de detalhes
   */
  const handleCloseModal = () => {
    setSelectedTest(null);
  };


  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provas</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando provas...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  // Obtém provas do mês selecionado
  const testsForSelectedMonth = getTestsForSelectedMonth();
  const examDays = getExamDays();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provas</Text>
        {isTeacher && (
          <TouchableOpacity onPress={handleCreateTest} style={styles.addButton}>
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!isTeacher && <View style={styles.placeholder} />}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadTests} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <Calendar
          selectedDate={selectedMonth}
          onDateChange={handleMonthChange}
          markedDates={examDays}
          onDayPress={handleDayPress}
          selectedDay={filterByDay ? selectedDay : null}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filterByDay && selectedDay !== null
              ? `Provas do dia ${selectedDay}`
              : testsForSelectedMonth.length > 0
                ? (() => {
                  const monthName = selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return `Provas de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
                })()
                : 'Provas'}
          </Text>
          {filterByDay && selectedDay !== null && (
            <TouchableOpacity
              onPress={handleShowAllMonth}
              style={styles.filterButton}
            >
              <Text style={styles.filterButtonText}>
                Ver todas do mês
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {tests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              Nenhuma prova encontrada
            </Text>
            <Text style={styles.emptySubtext}>
              {isTeacher
                ? 'Crie uma nova prova usando o botão + no topo'
                : 'Não há provas agendadas no momento'}
            </Text>
          </View>
        ) : testsForSelectedMonth.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={48} color={Colors.textMuted} />
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
          testsForSelectedMonth.map((test) => (
            <TouchableOpacity
              key={test.id}
              style={styles.examCard}
              onPress={() => handleViewTest(test)}
            >
              <View style={styles.examHeader}>
                <View style={styles.examHeaderLeft}>
                  <Text style={styles.examSubject}>{test.titulo}</Text>
                  <Text style={styles.examTeacher}>
                    {test.professor.usuario.nome_completo}
                  </Text>
                  <Text style={styles.examDiscipline}>
                    {test.disciplina.nome} • {test.turma.serie && test.turma.turma_letra ? `${test.turma.serie} ${test.turma.turma_letra}` : test.turma.nome}
                  </Text>
                </View>
                <View style={styles.examDateContainer}>
                  <Text style={styles.examDate}>
                    {test.data_prova_formatted || formatDate(test.data_prova)}
                  </Text>
                  {test.status === 'today' && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Hoje</Text>
                    </View>
                  )}
                </View>
              </View>

              {test.descricao && (
                <View style={styles.examDescription}>
                  <Text style={styles.examDescriptionText}>{test.descricao}</Text>
                </View>
              )}

              <View style={styles.examDetails}>
                {test.horario && (
                  <View style={styles.examDetailRow}>
                    <Clock size={16} color={Colors.textMuted} />
                    <Text style={styles.examDetailText}>
                      {formatTimeRange(test)}
                    </Text>
                  </View>
                )}
                {test.sala && (
                  <View style={styles.examDetailRow}>
                    <MapPin size={16} color={Colors.textMuted} />
                    <Text style={styles.examDetailText}>{test.sala}</Text>
                  </View>
                )}
                {test.duracao_minutos && (
                  <View style={styles.examDetailRow}>
                    <Clock size={16} color={Colors.textMuted} />
                    <Text style={styles.examDetailText}>
                      Duração: {test.duracao_minutos} minutos
                    </Text>
                  </View>
                )}
              </View>

              {isTeacher && (
                <View style={styles.examActions}>
                  <TouchableOpacity
                    onPress={() => handleEditTest(test)}
                    style={styles.actionButton}
                  >
                    <Edit size={16} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTest(test.id, test.titulo)}
                    style={[styles.actionButton, styles.deleteButton]}
                  >
                    <Trash2 size={16} color={Colors.error} />
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNav />

      {/* Modal de detalhes da prova */}
      <Modal
        visible={selectedTest !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View style={styles.modalContent}>
            {selectedTest && (
              <View style={styles.modalInnerContainer}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Text style={styles.modalTitle}>{selectedTest.titulo}</Text>
                    {selectedTest.status === 'today' && (
                      <View style={styles.modalTodayBadge}>
                        <Text style={styles.modalTodayBadgeText}>Hoje</Text>
                      </View>
                    )}
                    {selectedTest.status === 'upcoming' && (
                      <View style={styles.modalUpcomingBadge}>
                        <Text style={styles.modalUpcomingBadgeText}>Próxima</Text>
                      </View>
                    )}
                    {selectedTest.status === 'past' && (
                      <View style={styles.modalPastBadge}>
                        <Text style={styles.modalPastBadgeText}>Realizada</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                    <X size={24} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {selectedTest.descricao && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Descrição</Text>
                      <Text style={styles.modalDescription}>{selectedTest.descricao}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Informações</Text>

                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoIcon}>
                        <CalendarIcon size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Data</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedTest.data_prova_formatted || formatDate(selectedTest.data_prova)}
                        </Text>
                      </View>
                    </View>

                    {selectedTest.horario && (
                      <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoIcon}>
                          <Clock size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Horário</Text>
                          <Text style={styles.modalInfoValue}>
                            {formatTimeRange(selectedTest)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedTest.duracao_minutos && (
                      <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoIcon}>
                          <Clock size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Duração</Text>
                          <Text style={styles.modalInfoValue}>
                            {selectedTest.duracao_minutos} minutos
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedTest.sala && (
                      <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoIcon}>
                          <MapPin size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Sala</Text>
                          <Text style={styles.modalInfoValue}>{selectedTest.sala}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoIcon}>
                        <BookOpen size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Disciplina</Text>
                        <Text style={styles.modalInfoValue}>{selectedTest.disciplina.nome}</Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoIcon}>
                        <Users size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Turma</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedTest.turma.serie && selectedTest.turma.turma_letra 
                            ? `${selectedTest.turma.serie} ${selectedTest.turma.turma_letra}` 
                            : selectedTest.turma.nome}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoIcon}>
                        <User size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Professor</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedTest.professor.usuario.nome_completo}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {isTeacher && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => {
                        handleCloseModal();
                        handleEditTest(selectedTest);
                      }}
                      style={styles.modalActionButton}
                    >
                      <Edit size={18} color={Colors.primary} />
                      <Text style={styles.modalActionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        handleCloseModal();
                        handleDeleteTest(selectedTest.id, selectedTest.titulo);
                      }}
                      style={[styles.modalActionButton, styles.modalDeleteButton]}
                    >
                      <Trash2 size={18} color={Colors.error} />
                      <Text style={[styles.modalActionButtonText, styles.modalDeleteButtonText]}>
                        Excluir
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
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
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
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
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  examSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  examTeacher: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  examDiscipline: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  examDateContainer: {
    alignItems: 'flex-end',
  },
  examDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  todayBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  examDescription: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  examDescriptionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  examDetails: {
    gap: 8,
  },
  examDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examDetailText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  examActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.muted,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButtonText: {
    color: Colors.error,
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
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  modalInnerContainer: {
    flexDirection: 'column',
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 8,
  },
  modalTodayBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalTodayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  modalUpcomingBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalUpcomingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  modalPastBadge: {
    backgroundColor: Colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalPastBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  modalScrollView: {
    maxHeight: Dimensions.get('window').height * 0.45,
    minHeight: 200,
  },
  modalScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalInfoContent: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.muted,
  },
  modalDeleteButton: {
    backgroundColor: '#fee2e2',
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalDeleteButtonText: {
    color: Colors.error,
  },
});


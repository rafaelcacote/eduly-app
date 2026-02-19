import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Exercise, exercisesService } from '@/services/exercises';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Edit, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ExerciseStatus = 'pending' | 'completed' | 'overdue';

interface ExerciseWithStatus extends Exercise {
  status: ExerciseStatus;
}

export default function Exercises() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedStudent } = useStudent();
  const [filter, setFilter] = useState('Todos');
  const [exercises, setExercises] = useState<ExerciseWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = user?.type === 'teacher';

  /**
   * Calcula o status do exercício baseado na data de entrega
   */
  const calculateStatus = (exercise: Exercise): ExerciseStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(exercise.data_entrega);
    dueDate.setHours(23, 59, 59, 999);

    // TODO: Verificar se há entrega marcada como completa
    // Por enquanto, assumimos que não há sistema de entrega ainda
    // Quando houver, verificar se exercise.entregue === true

    if (dueDate < today) {
      return 'overdue';
    }

    return 'pending';
  };

  /**
   * Carrega exercícios da API
   */
  const loadExercises = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};

      // Se for responsável, filtra por aluno selecionado
      if (!isTeacher && selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const data = await exercisesService.getExercises(params);

      // Debug: verifica se tipo_exercicio está vindo da API
      console.log('Exercícios recebidos da API:', JSON.stringify(data.slice(0, 2), null, 2));

      // Adiciona status calculado a cada exercício
      const exercisesWithStatus: ExerciseWithStatus[] = data.map(exercise => ({
        ...exercise,
        status: calculateStatus(exercise),
      }));

      setExercises(exercisesWithStatus);
    } catch (err: any) {
      console.error('Erro ao carregar exercícios:', err);
      setError(err.message || 'Erro ao carregar exercícios');
      setExercises([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isTeacher, selectedStudent]);

  /**
   * Carrega exercícios ao montar o componente
   */
  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  /**
   * Atualiza lista ao puxar para baixo
   */
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadExercises();
  }, [loadExercises]);

  /**
   * Filtra exercícios baseado no filtro selecionado
   */
  const filteredExercises = exercises.filter((exercise) => {
    if (filter === 'Todos') return true;
    if (filter === 'Pendentes') return exercise.status === 'pending';
    if (filter === 'Entregues') return exercise.status === 'completed';
    if (filter === 'Atrasados') return exercise.status === 'overdue';
    return true;
  });

  /**
   * Formata data para exibição
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Retorna a string original se não for uma data válida
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
   * Retorna o emoji e texto baseado no tipo do exercício
   */
  const getExerciseTypeDisplay = (exercise: Exercise): string => {
    // Verifica tanto tipo_exercicio quanto tipo (para compatibilidade)
    const tipoExercicio = (exercise.tipo_exercicio || (exercise as any).tipo || '').toLowerCase().trim();

    // Debug: log para verificar o valor
    console.log(`[Exercício: ${exercise.titulo}] tipo_exercicio: "${exercise.tipo_exercicio || 'não definido'}" | tipo processado: "${tipoExercicio}"`);

    if (!tipoExercicio) {
      console.warn(`⚠️ Tipo de exercício não encontrado para: ${exercise.titulo}`);
      return '📝 Exercícios'; // Padrão
    }

    // Verifica se é exercício no livro (várias variações possíveis)
    if (tipoExercicio.includes('livro') && (tipoExercicio.includes('exercicio') || tipoExercicio.includes('exercício'))) {
      return '📝 Exercícios';
    }

    // Verifica se é exercício no caderno (várias variações possíveis)
    if (tipoExercicio.includes('caderno') && (tipoExercicio.includes('exercicio') || tipoExercicio.includes('exercício'))) {
      return '📝 Exercícios';
    }

    // Verifica se é trabalho escolar (várias variações possíveis)
    if (tipoExercicio.includes('trabalho')) {
      return '📚 Trabalho';
    }

    // Verifica valores exatos comuns
    const tipoNormalizado = tipoExercicio.replace(/\s+/g, ' ').trim();
    if (tipoNormalizado === 'exercicio livro' ||
      tipoNormalizado === 'exercício livro' ||
      tipoNormalizado === 'exercicio caderno' ||
      tipoNormalizado === 'exercício caderno') {
      return '📝 Exercícios';
    }

    if (tipoNormalizado === 'trabalho escolar' || tipoNormalizado === 'trabalho') {
      return '📚 Trabalho';
    }

    // Padrão caso não encontre um tipo específico
    console.warn(`⚠️ Tipo não reconhecido: "${tipoExercicio}" para exercício: ${exercise.titulo}`);
    return '📝 Exercícios';
  };

  /**
   * Deleta um exercício (apenas professores)
   */
  const handleDeleteExercise = async (exerciseId: string, exerciseTitle: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o exercício "${exerciseTitle}"?`,
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
              await exercisesService.deleteExercise(exerciseId);
              await loadExercises();
              Alert.alert('Sucesso', 'Exercício excluído com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao excluir exercício');
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeTextSuccess}>✓ Entregue</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.badge, styles.badgeWarning]}>
            <Text style={styles.badgeTextWarning}>⏱ Pendente</Text>
          </View>
        );
      case 'overdue':
        return (
          <View style={[styles.badge, styles.badgeDanger]}>
            <Text style={styles.badgeTextDanger}>⚠ Atrasado</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} color={Colors.success} />;
      case 'pending':
        return <Clock size={20} color={Colors.warning} />;
      case 'overdue':
        return <AlertCircle size={20} color={Colors.error} />;
      default:
        return null;
    }
  };

  const filters = ['Todos', 'Pendentes', 'Entregues', 'Atrasados'];

  /**
   * Navega para tela de criar exercício
   */
  const handleCreateExercise = () => {
    router.push('/create-exercise');
  };

  /**
   * Navega para tela de editar exercício
   */
  const handleEditExercise = (exercise: Exercise) => {
    router.push({
      pathname: '/create-exercise',
      params: { exerciseId: exercise.id },
    });
  };

  /**
   * Navega para detalhes do exercício
   */
  const handleViewExercise = (exercise: Exercise) => {
    // TODO: Implementar tela de detalhes
    Alert.alert('Detalhes', `Exercício: ${exercise.titulo}\n\n${exercise.descricao}`);
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercícios</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando exercícios...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercícios</Text>
        {isTeacher && (
          <TouchableOpacity onPress={handleCreateExercise} style={styles.addButton}>
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!isTeacher && <View style={styles.placeholder} />}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadExercises} style={styles.retryButton}>
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
        {filteredExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'Todos'
                ? 'Nenhum exercício encontrado'
                : `Nenhum exercício ${filter.toLowerCase()} encontrado`}
            </Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => handleViewExercise(exercise)}
            >
              <View style={styles.exerciseHeader}>
                {getStatusIcon(exercise.status)}
                <View style={styles.exerciseInfo}>
                  <View style={styles.exerciseTitleRow}>
                    <Text style={styles.exerciseType}>
                      {getExerciseTypeDisplay(exercise)}
                    </Text>
                  </View>
                  <Text style={styles.exerciseTitle}>{exercise.titulo}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.disciplina_nome || 'Disciplina'} • {exercise.professor_nome || 'Professor'}
                  </Text>
                  {exercise.turma_nome && (
                    <Text style={styles.exerciseClass}>
                      Turma: {exercise.turma_nome}
                    </Text>
                  )}
                </View>
                {getStatusBadge(exercise.status)}
              </View>

              <Text style={styles.exerciseDescription}>{exercise.descricao}</Text>

              <View style={styles.exerciseFooter}>
                <Text style={styles.exerciseDueDate}>
                  Prazo: <Text style={styles.exerciseDueDateBold}>{formatDate(exercise.data_entrega)}</Text>
                </Text>
                {exercise.anexo_url && (
                  <Text style={styles.exerciseAttachments}>
                    📎 Anexo disponível
                  </Text>
                )}
              </View>

              {isTeacher && (
                <View style={styles.exerciseActions}>
                  <TouchableOpacity
                    onPress={() => handleEditExercise(exercise)}
                    style={styles.actionButton}
                  >
                    <Edit size={16} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteExercise(exercise.id, exercise.titulo)}
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
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitleRow: {
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 2,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  exerciseClass: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
  },
  badgeTextSuccess: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  badgeTextWarning: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  badgeTextDanger: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  exerciseDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseDueDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  exerciseDueDateBold: {
    fontWeight: '600',
  },
  exerciseAttachments: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  exerciseActions: {
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
});


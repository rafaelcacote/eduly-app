import { AppHeader, AppHeaderAction } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ExerciseTeacherRow } from '@/components/ExerciseTeacher';
import { PulsingDot } from '@/components/PulsingDot';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import {
  Exercise,
  exercisesService,
  getExerciseTypeLabel,
} from '@/services/exercises';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, Edit, Paperclip, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
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

export default function Exercises() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedStudent } = useStudent();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenExerciseIds, setSeenExerciseIds] = useState<string[]>([]);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTeacher = user?.type === 'teacher';

  const loadExercises = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) {
        setError(null);
      }
      const params: { aluno_id?: string } = {};

      if (!isTeacher && selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const [data, seenIds] = await Promise.all([
        exercisesService.getExercises(params),
        isTeacher ? Promise.resolve([] as string[]) : exercisesService.getSeenExerciseIds(),
      ]);

      setSeenExerciseIds(seenIds);
      setExercises(Array.isArray(data) ? data : []);
      // Não marca todos como vistos ao abrir a lista — senão o "Novo" some
      // da tela inicial antes do responsável abrir o exercício.
    } catch (err: any) {
      console.error('Erro ao carregar exercícios:', err);
      setError(err.message || 'Erro ao carregar exercícios');
      setExercises([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isTeacher, selectedStudent]);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadExercises({ silent: true });
  }, [loadExercises]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const openDeleteConfirm = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    try {
      setIsDeleting(true);
      const deletedId = exerciseToDelete.id;
      await exercisesService.deleteExercise(deletedId);
      setExercises((prev) => prev.filter((item) => item.id !== deletedId));
      setExerciseToDelete(null);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao excluir exercício');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateExercise = () => {
    router.push('/create-exercise');
  };

  const handleEditExercise = (exercise: Exercise) => {
    router.push({
      pathname: '/create-exercise',
      params: { exerciseId: exercise.id },
    });
  };

  const handleViewExercise = (exercise: Exercise) => {
    router.push({
      pathname: '/exercise-detail',
      params: { exerciseId: exercise.id },
    });
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <AppHeader title="Exercícios" />
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
      <AppHeader
        title="Exercícios"
        right={
          isTeacher ? (
            <AppHeaderAction onPress={handleCreateExercise} accessibilityLabel="Criar exercício">
              <Plus size={20} color={Colors.white} />
            </AppHeaderAction>
          ) : undefined
        }
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadExercises()} style={styles.retryButton}>
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
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum exercício encontrado</Text>
          </View>
        ) : (
          exercises.map((exercise) => {
            const isNew =
              !isTeacher && exercisesService.isExerciseNew(exercise, seenExerciseIds);

            return (
              <View
                key={exercise.id}
                style={[styles.exerciseCard, isNew && styles.exerciseCardNew]}
              >
                <TouchableOpacity
                  onPress={() => handleViewExercise(exercise)}
                  activeOpacity={0.72}
                >
                  <ExerciseTeacherRow exercise={exercise} />

                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.exerciseTitle, isNew && styles.exerciseTitleNew]}
                      numberOfLines={2}
                    >
                      {exercise.titulo}
                    </Text>
                    {isNew && (
                      <View style={styles.newRow}>
                        <PulsingDot size={8} />
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>Novo</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {!!exercise.descricao?.trim() && (
                    <Text style={styles.exerciseDescription} numberOfLines={2}>
                      {exercise.descricao}
                    </Text>
                  )}

                  <View style={styles.cardMeta}>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>{getExerciseTypeLabel(exercise)}</Text>
                    </View>
                    <View style={styles.dueRow}>
                      <Calendar size={13} color={Colors.textMuted} />
                      <Text style={styles.dueText}>
                        Prazo{' '}
                        <Text style={styles.dueBold}>{formatDate(exercise.data_entrega)}</Text>
                      </Text>
                    </View>
                    {exercise.anexo_url ? (
                      <View style={styles.attachHint}>
                        <Paperclip size={13} color={Colors.primary} />
                      </View>
                    ) : null}
                  </View>

                  {exercise.turma_nome && isTeacher ? (
                    <Text style={styles.turmaText}>Turma {exercise.turma_nome}</Text>
                  ) : null}
                </TouchableOpacity>

                {isTeacher && (
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => handleEditExercise(exercise)}
                      style={styles.actionButton}
                      activeOpacity={0.75}
                    >
                      <Edit size={16} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openDeleteConfirm(exercise)}
                      style={[styles.actionButton, styles.deleteButton]}
                      activeOpacity={0.75}
                    >
                      <Trash2 size={16} color={Colors.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                        Excluir
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav />

      <DeleteConfirmModal
        visible={!!exerciseToDelete}
        itemName={exerciseToDelete?.titulo}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setExerciseToDelete(null);
        }}
        onConfirm={confirmDeleteExercise}
      />
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
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
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
  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  exerciseCardNew: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  exerciseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  exerciseTitleNew: {
    fontWeight: '800',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: Colors.primary,
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
  exerciseDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  typePill: {
    backgroundColor: Colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  dueBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  attachHint: {
    marginLeft: 'auto',
  },
  turmaText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 10,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
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

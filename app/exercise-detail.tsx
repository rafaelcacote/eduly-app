import { AppHeader, AppHeaderAction } from '@/components/AppHeader';
import { AttachmentCard } from '@/components/AttachmentCard';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ExerciseRequestCard } from '@/components/ExerciseTeacher';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Exercise, exercisesService } from '@/services/exercises';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Edit, Trash2, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExerciseDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTeacher = user?.type === 'teacher';

  const loadExercise = useCallback(async () => {
    if (!exerciseId) return;

    try {
      setIsLoading(true);
      const data = await exercisesService.getExerciseById(exerciseId);
      setExercise(data);
      await exercisesService.markExercisesSeen([data.id]);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar o exercício. Tente novamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, router]);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    if (!exercise) return;
    router.push({
      pathname: '/create-exercise',
      params: { exerciseId: exercise.id },
    });
  };

  const confirmDelete = async () => {
    if (!exercise) return;

    try {
      setIsDeleting(true);
      await exercisesService.deleteExercise(exercise.id);
      setShowDeleteConfirm(false);
      router.replace('/exercises');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao excluir exercício');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Exercício" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando exercício...</Text>
        </View>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <AppHeader title="Exercício" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Exercício não encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Exercício"
        right={
          isTeacher ? (
            <AppHeaderAction onPress={handleEdit} accessibilityLabel="Editar exercício">
              <Edit size={18} color={Colors.white} />
            </AppHeaderAction>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ExerciseRequestCard
          exercise={exercise}
          meta={
            <>
              <View style={styles.metaItem}>
                <Calendar size={16} color={Colors.primary} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Prazo de entrega</Text>
                  <Text style={styles.metaValue}>{formatDate(exercise.data_entrega)}</Text>
                </View>
              </View>
              {exercise.turma_nome ? (
                <View style={styles.metaItem}>
                  <Users size={16} color={Colors.primary} />
                  <View style={styles.metaTextWrap}>
                    <Text style={styles.metaLabel}>Turma</Text>
                    <Text style={styles.metaValue}>{exercise.turma_nome}</Text>
                  </View>
                </View>
              ) : null}
            </>
          }
          footer={
            exercise.anexo_url ? (
              <AttachmentCard url={exercise.anexo_url} tone="recado" variant="card" />
            ) : null
          }
        />

        <Text style={styles.createdAt}>
          Publicado em {formatDateTime(exercise.created_at)}
        </Text>

        {isTeacher && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteConfirm(true)}>
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Excluir exercício</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <DeleteConfirmModal
        visible={showDeleteConfirm}
        itemName={exercise.titulo}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setShowDeleteConfirm(false);
        }}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  metaTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  createdAt: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

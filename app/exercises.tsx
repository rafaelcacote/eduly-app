import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import BottomNav from '@/components/BottomNav';
import { useRouter } from 'expo-router';

export default function Exercises() {
  const router = useRouter();
  const [filter, setFilter] = useState('Todos');

  const exercises = [
    {
      id: 1,
      title: 'Exercícios de Matemática - Frações',
      subject: 'Matemática',
      teacher: 'Prof. Carlos Silva',
      dueDate: '02 Nov 2025',
      status: 'pending',
      description: 'Resolver os exercícios 1 a 20 da página 45 do livro didático.',
      attachments: ['exercicios_fracoes.pdf'],
    },
    {
      id: 2,
      title: 'Leitura de Livro - Macunaíma',
      subject: 'Português',
      teacher: 'Profa. Ana Santos',
      dueDate: '05 Nov 2025',
      status: 'pending',
      description: 'Ler os capítulos 1 a 5 do livro "Macunaíma" de Mário de Andrade.',
      attachments: ['lista_leitura.pdf'],
    },
    {
      id: 3,
      title: 'Pesquisa sobre Fotossíntese',
      subject: 'Ciências',
      teacher: 'Prof. Roberto Costa',
      dueDate: '01 Nov 2025',
      status: 'completed',
      description: 'Pesquisar e apresentar um resumo sobre o processo de fotossíntese.',
      attachments: ['guia_pesquisa.pdf'],
    },
    {
      id: 4,
      title: 'Exercícios de História',
      subject: 'História',
      teacher: 'Profa. Mariana Oliveira',
      dueDate: '31 Out 2025',
      status: 'overdue',
      description: 'Responder as questões sobre a Revolução Francesa.',
      attachments: ['questoes_historia.pdf'],
    },
  ];

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercícios</Text>
        <View style={styles.placeholder} />
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {exercises.map((exercise) => (
          <TouchableOpacity key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              {getStatusIcon(exercise.status)}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.subject} • {exercise.teacher}
                </Text>
              </View>
              {getStatusBadge(exercise.status)}
            </View>

            <Text style={styles.exerciseDescription}>{exercise.description}</Text>

            <View style={styles.exerciseFooter}>
              <Text style={styles.exerciseDueDate}>
                Prazo: <Text style={styles.exerciseDueDateBold}>{exercise.dueDate}</Text>
              </Text>
              {exercise.attachments.length > 0 && (
                <Text style={styles.exerciseAttachments}>
                  📎 {exercise.attachments.length} anexo(s)
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
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
});


import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import {
  AUTHOR_FALLBACK_NAME,
  getAuthorFirstName,
  getAuthorPhotoUrl,
} from '@/services/authors';
import {
  Exercise,
  getExerciseDisciplineName,
  getExerciseProfessorAuthor,
  getExerciseTypeLabel,
} from '@/services/exercises';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type ExerciseTeacherRowProps = {
  exercise: Exercise;
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * List strip: teacher photo + name + discipline.
 */
export function ExerciseTeacherRow({
  exercise,
  compact = true,
  style,
}: ExerciseTeacherRowProps) {
  const author = getExerciseProfessorAuthor(exercise);
  const name = author?.nome_completo || AUTHOR_FALLBACK_NAME;
  const discipline = getExerciseDisciplineName(exercise);

  return (
    <View style={[styles.row, style]}>
      <StudentAvatar
        nome={name}
        fotoUrl={getAuthorPhotoUrl(author)}
        size={compact ? 'md' : 'lg'}
        ring={false}
      />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.rowDiscipline} numberOfLines={1}>
          {discipline}
        </Text>
      </View>
    </View>
  );
}

type ExerciseRequestCardProps = {
  exercise: Exercise;
  meta?: ReactNode;
  footer?: ReactNode;
};

/**
 * Detail layout: who assigned the exercise, with clear discipline context.
 */
export function ExerciseRequestCard({
  exercise,
  meta,
  footer,
}: ExerciseRequestCardProps) {
  const author = getExerciseProfessorAuthor(exercise);
  const name = author?.nome_completo || AUTHOR_FALLBACK_NAME;
  const firstName = getAuthorFirstName(name);
  const discipline = getExerciseDisciplineName(exercise);
  const typeLabel = getExerciseTypeLabel(exercise);

  return (
    <View style={styles.requestWrap}>
      <View style={styles.requestAuthor}>
        <StudentAvatar nome={name} fotoUrl={getAuthorPhotoUrl(author)} size="lg" />
        <View style={styles.requestAuthorText}>
          <Text style={styles.requestEyebrow}>Solicitado por</Text>
          <Text style={styles.requestName} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.requestChips}>
            <View style={styles.disciplineChip}>
              <Text style={styles.disciplineChipText}>{discipline}</Text>
            </View>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{typeLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tailRow}>
        <View style={styles.tail} />
      </View>

      <View style={styles.bubble}>
        <Text style={styles.bubbleIntro}>{firstName} pediu:</Text>
        <Text style={styles.bubbleTitle}>{exercise.titulo}</Text>
        <Text style={styles.bubbleBody}>
          {exercise.descricao?.trim() || 'Sem descrição informada.'}
        </Text>
        {meta ? <View style={styles.bubbleMeta}>{meta}</View> : null}
        {footer ? <View style={styles.bubbleFooter}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  rowDiscipline: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  requestWrap: {
    gap: 0,
  },
  requestAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  requestAuthorText: {
    flex: 1,
    minWidth: 0,
  },
  requestEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  requestName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  requestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  disciplineChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  disciplineChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  typeChip: {
    backgroundColor: Colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tailRow: {
    paddingLeft: 28,
    zIndex: 1,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.white,
    marginBottom: -1,
  },
  bubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  bubbleIntro: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  bubbleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
    lineHeight: 26,
  },
  bubbleBody: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text,
  },
  bubbleMeta: {
    marginTop: 14,
    gap: 10,
  },
  bubbleFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

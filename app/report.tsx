import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Boletim, BoletimDisciplina, boletimService } from '@/services/boletim';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Award,
  BookOpen,
  ChevronDown,
  TrendingUp,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BIMESTRE_KEYS = ['1', '2', '3', '4'] as const;
const BIMESTRE_LABELS = ['1º', '2º', '3º', '4º'] as const;
const PASSING_GRADE = 7;

function formatGrade(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(1).replace('.', ',');
}

function getGradeTone(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return {
      bg: Colors.muted,
      text: Colors.textMuted,
      bar: Colors.textMuted,
      label: 'Pendente',
    };
  }
  if (value >= 9) {
    return {
      bg: '#d1fae5',
      text: Colors.success,
      bar: Colors.success,
      label: 'Excelente',
    };
  }
  if (value >= PASSING_GRADE) {
    return {
      bg: '#dbeafe',
      text: Colors.primary,
      bar: Colors.primary,
      label: 'Bom',
    };
  }
  if (value >= 5) {
    return {
      bg: '#fef3c7',
      text: Colors.warning,
      bar: Colors.warning,
      label: 'Atenção',
    };
  }
  return {
    bg: '#fee2e2',
    text: Colors.error,
    bar: Colors.error,
    label: 'Insuficiente',
  };
}

function getPerformanceLabel(media: number | null | undefined): string {
  if (media === null || media === undefined) return '—';
  return getGradeTone(media).label;
}

function countFilledBimestres(disciplinas: BoletimDisciplina[]): number {
  const filled = new Set<string>();
  for (const disc of disciplinas) {
    for (const key of BIMESTRE_KEYS) {
      if (disc.bimestres?.[key] !== null && disc.bimestres?.[key] !== undefined) {
        filled.add(key);
      }
    }
  }
  return filled.size;
}

export default function Report() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isLoadingAuth, user } = useAuth();
  const { students, selectedStudent, setSelectedStudent } = useStudent();
  const [boletim, setBoletim] = useState<Boletim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStudentSelector, setShowStudentSelector] = useState(false);

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

  const turmaId = selectedStudent?.turmas?.[0]?.id;

  const loadBoletim = useCallback(async () => {
    if (!selectedStudent?.id || !turmaId) {
      setBoletim(null);
      setError(
        !selectedStudent
          ? 'Selecione um aluno para ver o boletim.'
          : 'Este aluno não possui turma vinculada.'
      );
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await boletimService.getBoletim(selectedStudent.id, turmaId);
      setBoletim(data);
    } catch (err: any) {
      const message =
        err?.message || 'Não foi possível carregar o boletim. Tente novamente.';
      setError(message);
      setBoletim(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro', message, [{ text: 'OK' }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent, turmaId]);

  useEffect(() => {
    if (!isAuthenticated || user?.type === 'teacher') return;
    setIsLoading(true);
    loadBoletim();
  }, [isAuthenticated, user?.type, loadBoletim]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBoletim();
    setIsRefreshing(false);
  }, [loadBoletim]);

  const handleSelectStudent = async (student: NonNullable<typeof selectedStudent>) => {
    if (selectedStudent?.id === student.id) {
      setShowStudentSelector(false);
      return;
    }
    setShowStudentSelector(false);
    setIsLoading(true);
    await setSelectedStudent(student);
  };

  const mediaGeral = boletim?.media_geral ?? null;
  const mediaTone = getGradeTone(mediaGeral);
  const performanceLabel = getPerformanceLabel(mediaGeral);
  const bimestresPreenchidos = useMemo(
    () => (boletim ? countFilledBimestres(boletim.disciplinas) : 0),
    [boletim]
  );

  const studentName =
    selectedStudent?.nome_social || selectedStudent?.nome || boletim?.aluno?.nome || 'Aluno';
  const turmaLabel = boletim?.turma
    ? `${boletim.turma.serie} ${boletim.turma.turma_letra}`
    : selectedStudent?.turmas?.[0]
      ? `${selectedStudent.turmas[0].serie} ${selectedStudent.turmas[0].turma_letra}`
      : '';
  const anoLetivo =
    boletim?.turma?.ano_letivo ?? selectedStudent?.turmas?.[0]?.ano_letivo ?? null;

  return (
    <View style={styles.container}>
      <AppHeader title="Boletim">
        {students.length > 1 ? (
          <TouchableOpacity
            style={styles.studentSwitcher}
            onPress={() => setShowStudentSelector(true)}
            activeOpacity={0.7}
          >
            <View style={styles.studentSwitcherLeft}>
              <StudentAvatar
                nome={studentName}
                fotoUrl={selectedStudent?.foto_url}
                size="sm"
              />
              <View style={styles.studentSwitcherTextWrap}>
                <Text style={styles.studentSwitcherName} numberOfLines={1}>
                  {studentName}
                </Text>
                {!!turmaLabel && (
                  <Text style={styles.studentSwitcherMeta} numberOfLines={1}>
                    {turmaLabel}
                    {anoLetivo ? ` · ${anoLetivo}` : ''}
                  </Text>
                )}
              </View>
            </View>
            <ChevronDown size={18} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
      </AppHeader>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Carregando boletim...</Text>
        </View>
      ) : error && !boletim ? (
        <ScrollView
          contentContainerStyle={styles.centeredState}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.emptyIconWrap}>
            <BookOpen size={32} color={Colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Hero média geral */}
          <LinearGradient
            colors={
              mediaGeral !== null && mediaGeral >= PASSING_GRADE
                ? (Colors.gradient.success as [string, string])
                : mediaGeral !== null
                  ? (['#f59e0b', '#d97706'] as [string, string])
                  : (Colors.gradient.blue as [string, string])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Award size={16} color={Colors.white} />
                <Text style={styles.heroBadgeText}>Média geral</Text>
              </View>
              {anoLetivo ? (
                <Text style={styles.heroYear}>Ano {anoLetivo}</Text>
              ) : null}
            </View>
            <Text style={styles.heroValue}>{formatGrade(mediaGeral)}</Text>
            <View style={styles.heroBottom}>
              <View style={styles.heroMetaItem}>
                <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroMetaText}>{performanceLabel}</Text>
              </View>
              <Text style={styles.heroMetaText}>
                {boletim?.disciplinas?.length || 0} disciplinas
                {bimestresPreenchidos > 0
                  ? ` · ${bimestresPreenchidos}º bim. lançado`
                  : ''}
              </Text>
            </View>
          </LinearGradient>

          {/* Info da turma */}
          {(turmaLabel || boletim?.turma?.nome) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Turma</Text>
              <Text style={styles.infoValue}>
                {boletim?.turma?.nome || turmaLabel}
              </Text>
              <Text style={styles.infoSub}>
                {[turmaLabel, anoLetivo ? `Ano letivo ${anoLetivo}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}

          {/* Legenda */}
          <View style={styles.legendRow}>
            {[
              { label: '≥ 9', color: Colors.success },
              { label: '≥ 7', color: Colors.primary },
              { label: '≥ 5', color: Colors.warning },
              { label: '< 5', color: Colors.error },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Notas por disciplina</Text>

          {!boletim?.disciplinas?.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sem notas lançadas</Text>
              <Text style={styles.emptySubtitle}>
                As notas aparecerão aqui conforme forem registradas pela escola.
              </Text>
            </View>
          ) : (
            <View style={styles.gradesList}>
              {/* Cabeçalho das colunas */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.tableSubjectCol]}>
                  Disciplina
                </Text>
                {BIMESTRE_LABELS.map((label) => (
                  <Text key={label} style={styles.tableHeaderCell}>
                    {label}
                  </Text>
                ))}
                <Text style={styles.tableHeaderCell}>Méd.</Text>
              </View>

              {boletim.disciplinas.map((disc) => {
                const mediaToneDisc = getGradeTone(disc.media);
                return (
                  <View key={disc.id} style={styles.disciplineCard}>
                    <View style={styles.disciplineRow}>
                      <View style={styles.tableSubjectCol}>
                        <Text style={styles.disciplineName} numberOfLines={2}>
                          {disc.nome}
                        </Text>
                        {!!disc.sigla && (
                          <Text style={styles.disciplineSigla}>{disc.sigla}</Text>
                        )}
                      </View>

                      {BIMESTRE_KEYS.map((key) => {
                        const grade = disc.bimestres?.[key] ?? null;
                        const tone = getGradeTone(grade);
                        return (
                          <View
                            key={key}
                            style={[styles.gradeCell, { backgroundColor: tone.bg }]}
                          >
                            <Text style={[styles.gradeCellText, { color: tone.text }]}>
                              {formatGrade(grade)}
                            </Text>
                          </View>
                        );
                      })}

                      <View
                        style={[
                          styles.gradeCell,
                          styles.mediaCell,
                          { backgroundColor: mediaToneDisc.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.gradeCellText,
                            styles.mediaCellText,
                            { color: mediaToneDisc.text },
                          ]}
                        >
                          {formatGrade(disc.media)}
                        </Text>
                      </View>
                    </View>

                    {disc.media !== null && disc.media !== undefined && (
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(Math.max(disc.media, 0), 10) * 10}%`,
                              backgroundColor: mediaToneDisc.bar,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Resumo rápido */}
          {boletim && boletim.disciplinas.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Desempenho</Text>
                <Text style={[styles.summaryValue, { color: mediaTone.text }]}>
                  {performanceLabel}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Média geral</Text>
                <Text style={styles.summaryValue}>{formatGrade(mediaGeral)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Disciplinas</Text>
                <Text style={styles.summaryValue}>
                  {boletim.disciplinas.length}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

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
            <Text style={styles.modalTitle}>Selecionar aluno</Text>
            {students.map((student) => {
              const isSelected = selectedStudent?.id === student.id;
              const turma = student.turmas?.[0];
              const nome = student.nome_social || student.nome;
              return (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentOption,
                    isSelected && styles.studentOptionSelected,
                  ]}
                  onPress={() => handleSelectStudent(student)}
                >
                  <StudentAvatar nome={nome} fotoUrl={student.foto_url} size="sm" ring={isSelected} />
                  <View style={styles.studentOptionText}>
                    <Text
                      style={[
                        styles.studentOptionName,
                        isSelected && styles.studentOptionNameSelected,
                      ]}
                    >
                      {nome}
                    </Text>
                    {turma && (
                      <Text style={styles.studentOptionMeta}>
                        {turma.serie} {turma.turma_letra}
                        {turma.ano_letivo ? ` · ${turma.ano_letivo}` : ''}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  studentSwitcher: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  studentSwitcherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  studentSwitcherTextWrap: {
    flex: 1,
  },
  studentSwitcherName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  studentSwitcherMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  centeredState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  centeredText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroYear: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  heroBottom: {
    marginTop: 8,
    gap: 4,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  infoSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  gradesList: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tableSubjectCol: {
    flex: 2.2,
    paddingRight: 6,
  },
  disciplineCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  disciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disciplineName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  disciplineSigla: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gradeCell: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  gradeCellText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mediaCell: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  mediaCellText: {
    fontSize: 13,
  },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginTop: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  studentOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#eff6ff',
  },
  studentOptionText: {
    flex: 1,
    minWidth: 0,
  },
  studentOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  studentOptionNameSelected: {
    color: Colors.primary,
  },
  studentOptionMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

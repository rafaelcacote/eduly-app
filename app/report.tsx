import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft, TrendingUp, Award } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '@/components/BottomNav';
import { useRouter } from 'expo-router';

export default function Report() {
  const router = useRouter();

  const grades = [
    { subject: 'Matemática', grade: 8.5, average: 8.2, status: 'good' },
    { subject: 'Português', grade: 9.0, average: 8.8, status: 'excellent' },
    { subject: 'Ciências', grade: 7.8, average: 7.5, status: 'good' },
    { subject: 'História', grade: 8.2, average: 8.0, status: 'good' },
    { subject: 'Geografia', grade: 7.5, average: 7.3, status: 'good' },
    { subject: 'Inglês', grade: 8.0, average: 7.9, status: 'good' },
    { subject: 'Educação Física', grade: 9.5, average: 9.3, status: 'excellent' },
    { subject: 'Arte', grade: 9.0, average: 8.7, status: 'excellent' },
  ];

  const getGradeColor = (grade: number) => {
    if (grade >= 9) return { bg: '#d1fae5', text: Colors.success };
    if (grade >= 7) return { bg: '#dbeafe', text: Colors.primary };
    return { bg: '#fef3c7', text: Colors.warning };
  };

  const getGradeStatus = (grade: number) => {
    if (grade >= 9) return 'Excelente';
    if (grade >= 7) return 'Bom';
    if (grade >= 5) return 'Satisfatório';
    return 'Insuficiente';
  };

  const overallAverage = (
    grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
  ).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boletim</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={Colors.gradient.success}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statHeader}>
              <Award size={20} color={Colors.white} />
              <Text style={styles.statLabel}>Média Geral</Text>
            </View>
            <Text style={styles.statValue}>{overallAverage}</Text>
          </LinearGradient>

          <LinearGradient
            colors={Colors.gradient.blue}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statHeader}>
              <TrendingUp size={20} color={Colors.white} />
              <Text style={styles.statLabel}>Desempenho</Text>
            </View>
            <Text style={styles.statValue}>Bom</Text>
          </LinearGradient>
        </View>

        <View style={styles.trimesterCard}>
          <Text style={styles.trimesterTitle}>1º Trimestre 2025</Text>
          <View style={styles.trimesterInfo}>
            <View style={styles.trimesterRow}>
              <Text style={styles.trimesterLabel}>Período:</Text>
              <Text style={styles.trimesterValue}>01 Set - 31 Out 2025</Text>
            </View>
            <View style={styles.trimesterRow}>
              <Text style={styles.trimesterLabel}>Status:</Text>
              <Text style={[styles.trimesterValue, { color: Colors.success }]}>
                Aprovado
              </Text>
            </View>
            <View style={styles.trimesterRow}>
              <Text style={styles.trimesterLabel}>Faltas:</Text>
              <Text style={styles.trimesterValue}>3 dias</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Notas por Disciplina</Text>
        <View style={styles.gradesList}>
          {grades.map((g, i) => {
            const gradeColors = getGradeColor(g.grade);
            return (
              <View key={i} style={styles.gradeCard}>
                <View style={styles.gradeHeader}>
                  <Text style={styles.gradeSubject}>{g.subject}</Text>
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: gradeColors.bg },
                    ]}
                  >
                    <Text style={[styles.gradeValue, { color: gradeColors.text }]}>
                      {g.grade}
                    </Text>
                  </View>
                </View>
                <View style={styles.gradeMeta}>
                  <Text style={styles.gradeAverage}>Média: {g.average}</Text>
                  <Text style={styles.gradeStatus}>{getGradeStatus(g.grade)}</Text>
                </View>
                <View style={styles.gradeProgress}>
                  <View
                    style={[
                      styles.gradeProgressBar,
                      {
                        width: `${(g.grade / 10) * 100}%`,
                        backgroundColor: gradeColors.text,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.observationsCard}>
          <Text style={styles.observationsTitle}>Observações do Professor</Text>
          <Text style={styles.observationsText}>
            João demonstra bom desempenho acadêmico com participação ativa em sala de aula.
            Recomenda-se continuar com os estudos e dedicação. Excelente comportamento e
            relacionamento com colegas.
          </Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
  },
  trimesterCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trimesterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  trimesterInfo: {
    gap: 8,
  },
  trimesterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trimesterLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  trimesterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  gradesList: {
    gap: 8,
  },
  gradeCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gradeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gradeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gradeAverage: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  gradeStatus: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  gradeProgress: {
    height: 8,
    backgroundColor: Colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradeProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  observationsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  observationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  observationsText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});

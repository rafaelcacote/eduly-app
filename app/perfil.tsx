import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { teachersService, Turma } from '@/services/teachers';
import { Student } from '@/services/students';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Phone, User, GraduationCap, BookOpen, Building2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone: string | null): string {
  if (!phone) return 'Não informado';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export default function Perfil() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { students, selectedStudent, isLoading: isLoadingStudents, refreshStudents } = useStudent();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  const loadTurmas = useCallback(async () => {
    if (user?.type !== 'teacher') return;
    try {
      setIsLoadingTurmas(true);
      const data = await teachersService.getTurmas();
      setTurmas(data);
    } catch {
      setTurmas([]);
    } finally {
      setIsLoadingTurmas(false);
    }
  }, [user?.type]);

  useEffect(() => {
    if (isAuthenticated && user?.type === 'teacher') {
      loadTurmas();
    }
  }, [isAuthenticated, user?.type, loadTurmas]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (user?.type === 'teacher') {
      await loadTurmas();
    } else {
      await refreshStudents();
    }
    setIsRefreshing(false);
  }, [user?.type, loadTurmas, refreshStudents]);

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={Colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarPlaceholder}>
            <User size={48} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.profileName}>{user?.nome_completo || '...'}</Text>
          <Text style={styles.profileRole}>
            {user?.type === 'teacher' ? 'Professor(a)' : 'Responsável'}
          </Text>
          {(() => {
            const schoolName =
              user?.type === 'responsavel'
                ? selectedStudent?.school?.nome || students[0]?.school?.nome
                : turmas[0]?.school?.nome || turmas[0]?.escola?.nome;
            return schoolName ? (
              <Text style={styles.profileSchool}>{schoolName}</Text>
            ) : null;
          })()}
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Mail size={18} color={Colors.textMuted} />
              <Text style={styles.infoLabel}>E-mail</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user?.email || '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <User size={18} color={Colors.textMuted} />
              <Text style={styles.infoLabel}>CPF</Text>
              <Text style={styles.infoValue}>{formatCPF(user?.cpf || '')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Phone size={18} color={Colors.textMuted} />
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{formatPhone(user?.telefone)}</Text>
            </View>
            {(() => {
              const schoolName =
                user?.type === 'responsavel'
                  ? selectedStudent?.school?.nome || students[0]?.school?.nome
                  : turmas[0]?.school?.nome || turmas[0]?.escola?.nome;
              return schoolName ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Building2 size={18} color={Colors.textMuted} />
                    <Text style={styles.infoLabel}>Escola</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{schoolName}</Text>
                  </View>
                </>
              ) : null;
            })()}
          </View>
        </View>

        {user?.type === 'responsavel' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alunos vinculados</Text>
            {isLoadingStudents ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.emptyText}>Carregando alunos...</Text>
              </View>
            ) : students.length === 0 ? (
              <View style={styles.emptyCard}>
                <GraduationCap size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Nenhum aluno vinculado</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {students.map((student: Student) => {
                  const turma = student.turmas[0];
                  const nome = student.nome_social || student.nome;
                  return (
                    <View key={student.id} style={styles.studentItem}>
                      <View style={styles.studentIcon}>
                        <GraduationCap size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{nome}</Text>
                        {turma && (
                          <Text style={styles.studentTurma}>
                            {turma.serie} {turma.turma_letra} • {student.school?.nome}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {user?.type === 'teacher' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turmas</Text>
            {isLoadingTurmas ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.emptyText}>Carregando turmas...</Text>
              </View>
            ) : turmas.length === 0 ? (
              <View style={styles.emptyCard}>
                <BookOpen size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Nenhuma turma vinculada</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {turmas.map((turma: Turma) => (
                  <View key={turma.id} style={styles.studentItem}>
                    <View style={styles.studentIcon}>
                      <BookOpen size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{turma.serie} {turma.turma_letra}</Text>
                      <Text style={styles.studentTurma}>{turma.nome}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === 'android' ? 48 : 0) + 16,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
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
  },
  profileCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  profileSchool: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    width: 70,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
    marginLeft: 30,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  studentTurma: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
});

import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { getUserPhotoUrl } from '@/services/auth';
import { teachersService, Turma } from '@/services/teachers';
import { Student } from '@/services/students';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Mail, Phone, User, GraduationCap, BookOpen, Building2, Camera, Lock, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const { user, isAuthenticated, isLoading: isLoadingAuth, refreshUser, updatePhoto } = useAuth();
  const { students, selectedStudent, isLoading: isLoadingStudents, refreshStudents } = useStudent();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const isTeacher = user?.type === 'teacher';
  const [schoolLogoFailed, setSchoolLogoFailed] = useState(false);

  const schoolInfo = useMemo(() => {
    if (user?.type === 'responsavel') {
      const school = selectedStudent?.school || students[0]?.school;
      return {
        name: school?.nome || null,
        logoUrl: resolveMediaUrl(school?.logo_url),
      };
    }
    const school = turmas[0]?.school;
    return {
      name: school?.nome || turmas[0]?.escola?.nome || null,
      logoUrl: resolveMediaUrl(school?.logo_url),
    };
  }, [user?.type, selectedStudent, students, turmas]);

  useEffect(() => {
    setSchoolLogoFailed(false);
  }, [schoolInfo.logoUrl]);

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
    try {
      await refreshUser();
    } catch {
      // Mantém dados locais se a atualização falhar
    }
    if (user?.type === 'teacher') {
      await loadTurmas();
    } else {
      await refreshStudents();
    }
    setIsRefreshing(false);
  }, [user?.type, loadTurmas, refreshStudents, refreshUser]);

  const handleChangePhoto = useCallback(async () => {
    if (!isTeacher || isUploadingPhoto) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        const message =
          'Permissão necessária para acessar a galeria e alterar a foto de perfil.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Permissão necessária', message);
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setIsUploadingPhoto(true);

      await updatePhoto({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });

      const successMessage = 'Foto de perfil atualizada com sucesso.';
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Sucesso', successMessage);
      }
    } catch (error: any) {
      const message = error?.message || 'Não foi possível atualizar a foto. Tente novamente.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Erro', message);
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [isTeacher, isUploadingPhoto, updatePhoto]);

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Perfil" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={Colors.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileGlow} />

          <View style={styles.avatarWrap}>
            <StudentAvatar
              nome={user?.nome_completo || 'Usuário'}
              fotoUrl={getUserPhotoUrl(user)}
              size="xl"
              ring
              style={styles.profileAvatar}
            />
            {isTeacher && (
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handleChangePhoto}
                disabled={isUploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Trocar foto de perfil"
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Camera size={16} color={Colors.white} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>{user?.nome_completo || '...'}</Text>
          <Text style={styles.profileRole}>
            {user?.type === 'teacher' ? 'Professor(a)' : 'Responsável'}
          </Text>
          {isTeacher && (
            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
              style={styles.changePhotoLink}
              accessibilityRole="button"
            >
              <Text style={styles.changePhotoLinkText}>
                {isUploadingPhoto ? 'Enviando foto...' : 'Trocar foto'}
              </Text>
            </TouchableOpacity>
          )}

          {schoolInfo.name ? (
            <View style={styles.schoolBadge}>
              <View style={styles.schoolLogoFrame}>
                {schoolInfo.logoUrl && !schoolLogoFailed ? (
                  <Image
                    source={{ uri: schoolInfo.logoUrl }}
                    style={styles.schoolLogo}
                    contentFit="contain"
                    accessibilityLabel={`Logo da ${schoolInfo.name}`}
                    onError={() => setSchoolLogoFailed(true)}
                  />
                ) : (
                  <Building2 size={22} color={Colors.primary} strokeWidth={2} />
                )}
              </View>
              <View style={styles.schoolBadgeText}>
                <Text style={styles.schoolBadgeLabel}>Escola</Text>
                <Text style={styles.schoolBadgeName} numberOfLines={2}>
                  {schoolInfo.name}
                </Text>
              </View>
            </View>
          ) : null}
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
            {schoolInfo.name ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  {schoolInfo.logoUrl && !schoolLogoFailed ? (
                    <Image
                      source={{ uri: schoolInfo.logoUrl }}
                      style={styles.infoSchoolLogo}
                      contentFit="contain"
                      accessibilityLabel={`Logo da ${schoolInfo.name}`}
                      onError={() => setSchoolLogoFailed(true)}
                    />
                  ) : (
                    <Building2 size={18} color={Colors.textMuted} />
                  )}
                  <Text style={styles.infoLabel}>Escola</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{schoolInfo.name}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          <View style={styles.listCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/change-password')}
              accessibilityRole="button"
              accessibilityLabel="Alterar senha"
            >
              <View style={styles.actionIcon}>
                <Lock size={18} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Alterar senha</Text>
                <Text style={styles.actionSubtitle}>Troque sua senha de acesso ao app</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
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
                  const studentLogo = resolveMediaUrl(student.school?.logo_url);
                  return (
                    <View key={student.id} style={styles.studentItem}>
                      <View style={styles.studentAvatarWrap}>
                        <StudentAvatar nome={nome} fotoUrl={student.foto_url} size="md" />
                        {studentLogo ? (
                          <View style={styles.studentSchoolLogoBadge}>
                            <Image
                              source={{ uri: studentLogo }}
                              style={styles.studentSchoolLogo}
                              contentFit="contain"
                              accessibilityLabel={`Logo da ${student.school?.nome || 'escola'}`}
                            />
                          </View>
                        ) : null}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  profileGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  profileAvatar: {
    marginBottom: 0,
  },
  changePhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoLink: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changePhotoLinkText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
    fontWeight: '500',
  },
  schoolBadge: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  schoolLogoFrame: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  schoolLogo: {
    width: 40,
    height: 40,
  },
  schoolBadgeText: {
    flex: 1,
    minWidth: 0,
  },
  schoolBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  schoolBadgeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  infoSchoolLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
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
  studentAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  studentSchoolLogoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  studentSchoolLogo: {
    width: 16,
    height: 16,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { teachersService, Aluno } from '@/services/teachers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TurmaAlunos() {
  const router = useRouter();
  const params = useLocalSearchParams<{ turmaId: string; serie?: string; turma_letra?: string }>();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  useEffect(() => {
    if (params.turmaId) {
      loadAlunos();
    }
  }, [params.turmaId]);

  const loadAlunos = async () => {
    if (!params.turmaId) return;
    
    try {
      setIsLoading(true);
      const alunosData = await teachersService.getAlunosByTurma(params.turmaId);
      setAlunos(alunosData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível carregar os alunos.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAlunos();
    setIsRefreshing(false);
  };

  const handleSendMessage = (aluno: Aluno) => {
    router.push({
      pathname: '/send-message',
      params: {
        alunoId: aluno.id,
        alunoNome: aluno.nome_social || aluno.nome,
      },
    });
  };

  const turmaTitle = params.serie && params.turma_letra 
    ? `${params.serie} ${params.turma_letra}` 
    : 'Turma';

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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Alunos da Turma</Text>
          <Text style={styles.headerSubtitle}>{turmaTitle}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando alunos...</Text>
          </View>
        ) : alunos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum aluno encontrado</Text>
            <Text style={styles.emptyText}>
              Esta turma não possui alunos matriculados no momento.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Users size={20} color={Colors.primary} />
              <Text style={styles.infoText}>
                {alunos.length} {alunos.length === 1 ? 'aluno matriculado' : 'alunos matriculados'}
              </Text>
            </View>

            <View style={styles.alunosList}>
              {alunos.map((aluno) => (
                <View key={aluno.id} style={styles.alunoCard}>
                  <View style={styles.alunoAvatar}>
                    <Text style={styles.alunoAvatarText}>
                      {(aluno.nome_social || aluno.nome).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>
                      {aluno.nome_social || aluno.nome}
                    </Text>
                    {aluno.nome_social && aluno.nome_social !== aluno.nome && (
                      <Text style={styles.alunoNomeCompleto}>{aluno.nome}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => handleSendMessage(aluno)}
                  >
                    <Mail size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff5ff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff5ff',
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  alunosList: {
    gap: 10,
  },
  alunoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  alunoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alunoAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  alunoInfo: {
    flex: 1,
    gap: 4,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  alunoNomeCompleto: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

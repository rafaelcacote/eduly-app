import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AttachmentCard } from '@/components/AttachmentCard';
import { AuthorSpeechCard } from '@/components/AuthorSpeech';
import { Colors } from '@/constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Aviso, avisosService } from '@/services/avisos';

export default function AvisoDetail() {
  const router = useRouter();
  const { avisoId } = useLocalSearchParams<{ avisoId: string }>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (avisoId) {
      loadAviso();
    }
  }, [avisoId]);

  const loadAviso = async () => {
    if (!avisoId) return;

    try {
      setIsLoading(true);
      const data = await avisosService.getAvisoById(avisoId);
      setAviso(data);
      await avisosService.setLastSeenAvisosAt();
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar o comunicado. Tente novamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (prioridade: string): string => {
    if (prioridade === 'alta') return Colors.error;
    if (prioridade === 'baixa') return Colors.textMuted;
    return Colors.warning;
  };

  const getPriorityLabel = (prioridade: string): string => {
    if (prioridade === 'alta') return 'Alta prioridade';
    if (prioridade === 'baixa') return 'Baixa prioridade';
    return 'Prioridade normal';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Comunicado" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando comunicado...</Text>
        </View>
      </View>
    );
  }

  if (!aviso) {
    return (
      <View style={styles.container}>
        <AppHeader title="Comunicado" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Comunicado não disponível</Text>
          <Text style={styles.emptySubtext}>
            Este comunicado pode ter sido removido ou não estar mais disponível.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Comunicado" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <AuthorSpeechCard
          author={aviso.criado_por}
          tone="comunicado"
          title={aviso.titulo}
          body={aviso.conteudo}
          meta={
            <>
              {aviso.tenant?.nome ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{aviso.tenant.nome}</Text>
                </View>
              ) : null}
              <View style={[styles.metaChip, styles.metaChipSchool]}>
                <Text style={[styles.metaChipText, styles.metaChipSchoolText]}>
                  Toda a escola
                </Text>
              </View>
              {aviso.prioridade !== 'normal' && (
                <View
                  style={[
                    styles.metaChip,
                    { backgroundColor: getPriorityColor(aviso.prioridade) + '18' },
                  ]}
                >
                  <Text
                    style={[styles.metaChipText, { color: getPriorityColor(aviso.prioridade) }]}
                  >
                    {getPriorityLabel(aviso.prioridade)}
                  </Text>
                </View>
              )}
            </>
          }
          footer={
            <Text style={styles.footerDate}>
              Publicado em {formatDate(aviso.publicado_em || aviso.created_at)}
            </Text>
          }
        />

        {aviso.anexo_url ? (
          <View style={styles.attachmentSection}>
            <Text style={styles.attachmentLabel}>Anexo</Text>
            <AttachmentCard url={aviso.anexo_url} tone="comunicado" variant="card" />
          </View>
        ) : null}
      </ScrollView>
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
    gap: 14,
  },
  metaChip: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaChipSchool: {
    backgroundColor: '#ccfbf1',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
  },
  metaChipSchoolText: {
    color: '#0f766e',
  },
  footerDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  attachmentSection: {
    gap: 8,
  },
  attachmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.2,
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
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

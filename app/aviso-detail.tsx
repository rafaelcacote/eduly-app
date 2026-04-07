import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
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
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar o aviso. Tente novamente.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
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

  const handleOpenAttachment = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o anexo.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o anexo.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aviso</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando aviso...</Text>
        </View>
      </View>
    );
  }

  if (!aviso) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aviso</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aviso não disponível</Text>
          <Text style={styles.emptySubtext}>
            Este aviso pode ter sido removido ou não estar mais disponível.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aviso</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.messageHeader}>
          <View style={styles.messageHeaderTop}>
            <Text style={styles.avisoIcon}>📢</Text>
            <View style={styles.messageHeaderContent}>
              <Text style={styles.messageTitle}>{aviso.titulo}</Text>
              <View style={styles.messageMeta}>
                {aviso.tenant?.nome && (
                  <Text style={styles.tenantBadge}>{aviso.tenant.nome}</Text>
                )}
                {aviso.prioridade !== 'normal' && (
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(aviso.prioridade) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(aviso.prioridade) },
                      ]}
                    >
                      {getPriorityLabel(aviso.prioridade)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.messageDateContainer}>
            <Text style={styles.messageDate}>
              Publicado em {formatDate(aviso.publicado_em || aviso.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.messageBody}>
          <Text style={styles.messageContent}>{aviso.conteudo}</Text>
        </View>

        {aviso.anexo_url && (
          <View style={styles.attachmentContainer}>
            <Text style={styles.attachmentLabel}>Anexo:</Text>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => handleOpenAttachment(aviso.anexo_url!)}
            >
              <ExternalLink size={18} color={Colors.primary} />
              <Text style={styles.attachmentText}>Abrir anexo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 16,
    paddingBottom: 16,
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
  },
  messageHeader: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageHeaderTop: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  avisoIcon: {
    fontSize: 28,
  },
  messageHeaderContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tenantBadge: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messageDateContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageBody: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageContent: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  attachmentContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachmentText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

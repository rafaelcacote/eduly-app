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
import { ArrowLeft, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Message, messagesService, MessageType } from '@/services/messages';
import { useAuth } from '@/context/AuthContext';

export default function MessageDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (messageId) {
      loadMessage();
    }
  }, [messageId]);

  const loadMessage = async () => {
    if (!messageId) return;

    try {
      setIsLoading(true);
      const messageData = await messagesService.getMessageById(messageId);
      setMessage(messageData);

      // Marca como lida se ainda não estiver lida
      if (!messageData.lida) {
        await messagesService.markAsRead(messageId);
        setMessage({ ...messageData, lida: true, lida_em: new Date().toISOString() });
      }
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar a mensagem. Tente novamente.',
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

  // Ícones de mensagem - usando emojis
  const getMessageIcon = (tipo: MessageType): string => {
    const iconEmojis: Record<MessageType, string> = {
      informativo: 'ℹ️', // Informativo → neutro
      atencao: '⚠️',     // Atenção → médio
      aviso: '🚨',       // Aviso → alto
      lembrete: '🔔',    // Lembrete → ação futura
    };

    return iconEmojis[tipo] || '📄';
  };

  // Componente de ícone de mensagem
  const MessageIcon = ({ tipo }: { tipo: MessageType }) => {
    const emoji = getMessageIcon(tipo);
    return <Text style={styles.messageIcon}>{emoji}</Text>;
  };

  const getPriorityColor = (prioridade: string): string => {
    if (prioridade === 'alta') return Colors.error;
    if (prioridade === 'media') return Colors.warning;
    return Colors.textMuted;
  };

  const getPriorityLabel = (prioridade: string): string => {
    if (prioridade === 'alta') return 'Alta Prioridade';
    if (prioridade === 'media') return 'Média Prioridade';
    return 'Prioridade Normal';
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

  const handleDeleteMessage = () => {
    if (!message) return;

    Alert.alert(
      'Excluir Mensagem',
      `Tem certeza que deseja excluir a mensagem "${message.titulo}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesService.deleteMessage(message.id);
              Alert.alert('Sucesso', 'Mensagem excluída com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao excluir mensagem');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensagem</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando mensagem...</Text>
        </View>
      </View>
    );
  }

  if (!message) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensagem</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Mensagem não encontrada</Text>
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
        <Text style={styles.headerTitle}>Mensagem</Text>
        {user?.type === 'teacher' ? (
          <TouchableOpacity onPress={handleDeleteMessage} style={styles.deleteButton}>
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho da mensagem */}
        <View style={styles.messageHeader}>
          <View style={styles.messageHeaderTop}>
            <MessageIcon tipo={message.tipo} />
            <View style={styles.messageHeaderContent}>
              <Text style={styles.messageTitle}>{message.titulo}</Text>
              <View style={styles.messageMeta}>
                <Text style={styles.messageType}>{message.tipo}</Text>
                {message.prioridade !== 'normal' && (
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(message.prioridade) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(message.prioridade) },
                      ]}
                    >
                      {getPriorityLabel(message.prioridade)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.messageDateContainer}>
            <Text style={styles.messageDate}>{formatDate(message.created_at)}</Text>
            {message.lida && (
              <View style={styles.readIndicator}>
                <CheckCircle2 size={16} color={Colors.success} />
                <Text style={styles.readText}>
                  Lida em {message.lida_em ? formatDate(message.lida_em) : 'agora'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Conteúdo da mensagem */}
        <View style={styles.messageBody}>
          <Text style={styles.messageContent}>{message.conteudo}</Text>
        </View>

        {/* Anexo */}
        {message.anexo_url && (
          <View style={styles.attachmentContainer}>
            <Text style={styles.attachmentLabel}>Anexo:</Text>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => handleOpenAttachment(message.anexo_url!)}
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
  messageIcon: {
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
  messageType: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'capitalize',
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
    marginBottom: 8,
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
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
  },
});

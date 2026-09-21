import { AppHeader } from '@/components/AppHeader';
import { AttachmentCard } from '@/components/AttachmentCard';
import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { getAuthorFirstName, getAuthorPhotoUrl, getRecadoDaProfLabel } from '@/services/authors';
import { Message, messagesService } from '@/services/messages';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessageDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { messageId, conversaId: conversaIdParam } = useLocalSearchParams<{
    messageId?: string;
    conversaId?: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(conversaIdParam || null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const isParent = user?.type === 'responsavel';

  const loadThread = useCallback(async () => {
    try {
      setIsLoading(true);

      let resolvedConversaId = conversaIdParam || null;
      let thread: Message[] = [];

      if (resolvedConversaId) {
        const history = await messagesService.getConversation(resolvedConversaId);
        resolvedConversaId = history.conversa_id;
        thread = history.messages;
      } else if (messageId) {
        const single = await messagesService.getMessageById(messageId);
        resolvedConversaId = single.conversa_id || single.id;

        try {
          const history = await messagesService.getConversation(resolvedConversaId);
          resolvedConversaId = history.conversa_id || resolvedConversaId;
          thread = history.messages.length > 0 ? history.messages : [single];
        } catch {
          thread = [single];
        }
      }

      setConversaId(resolvedConversaId);
      setMessages(thread);

      if (resolvedConversaId) {
        try {
          await messagesService.markConversationAsRead(resolvedConversaId);
          setMessages((prev) =>
            prev.map((item) => ({
              ...item,
              lida: true,
              lida_em: item.lida_em || new Date().toISOString(),
            }))
          );
        } catch {
          // Não bloqueia a leitura se marcar como lida falhar
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar a conversa. Tente novamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversaIdParam, messageId, router]);

  useEffect(() => {
    if (messageId || conversaIdParam) {
      loadThread();
    }
  }, [messageId, conversaIdParam, loadThread]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 50 : 120);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const teacherAuthor = useMemo(() => {
    if (!isParent || !user?.id) return null;
    const fromTeacher = messages.find(
      (item) => item.remetente?.id && item.remetente.id !== user.id
    )?.remetente;
    return fromTeacher || null;
  }, [isParent, messages, user?.id]);

  const headerTitle = useMemo(() => {
    if (isParent && teacherAuthor) {
      return getRecadoDaProfLabel(teacherAuthor.nome_completo);
    }
    const first = messages[0];
    if (!first) return 'Conversa';
    return first.titulo?.replace(/^Re:\s*/i, '') || 'Conversa';
  }, [isParent, teacherAuthor, messages]);

  const headerSubtitle = useMemo(() => {
    const first = messages[0];
    const alunoNome = first?.aluno?.nome_social || first?.aluno?.nome;
    if (isParent && teacherAuthor) {
      const subject = first?.titulo?.replace(/^Re:\s*/i, '');
      if (subject) return subject;
    }
    if (alunoNome) return `Sobre ${alunoNome}`;
    return undefined;
  }, [isParent, teacherAuthor, messages]);

  const canReply = Boolean(conversaId || messages[messages.length - 1]?.id);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Atenção', 'Escreva uma resposta.');
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!conversaId && !lastMessage?.id) {
      Alert.alert('Erro', 'Não foi possível identificar a conversa.');
      return;
    }

    try {
      setIsSending(true);
      const created = await messagesService.replyToConversation({
        conversa_id: conversaId || undefined,
        mensagem_pai_id: lastMessage?.id,
        conteudo: replyText.trim(),
      });

      setMessages((prev) => [...prev, created]);
      setReplyText('');
      setConversaId(created.conversa_id || conversaId);

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível enviar a resposta.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Conversa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando conversa...</Text>
        </View>
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="Conversa" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Conversa não encontrada</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={headerTitle} subtitle={headerSubtitle} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (isKeyboardVisible) {
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          {messages.map((item) => {
            const isMine = item.remetente?.id === user?.id;
            const authorName = item.remetente?.nome_completo || 'Participante';

            return (
              <View
                key={item.id}
                style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}
              >
                {!isMine && (
                  <StudentAvatar
                    nome={authorName}
                    fotoUrl={getAuthorPhotoUrl(item.remetente)}
                    size="sm"
                  />
                )}
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.bubbleAuthor} numberOfLines={1}>
                      {getAuthorFirstName(authorName)}
                    </Text>
                  )}
                  {!!item.titulo && (
                    <Text
                      style={[styles.bubbleTitle, isMine && styles.bubbleTitleMine]}
                      numberOfLines={2}
                    >
                      {item.titulo}
                    </Text>
                  )}
                  <Text style={[styles.bubbleBody, isMine && styles.bubbleBodyMine]}>
                    {item.conteudo}
                  </Text>
                  {item.anexo_url ? (
                    <AttachmentCard
                      url={item.anexo_url}
                      variant="bubble"
                      tone={isMine ? 'mine' : 'recado'}
                    />
                  ) : null}
                  <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {canReply && (
          <View
            style={[
              styles.composerWrap,
              {
                paddingBottom: isKeyboardVisible
                  ? 10
                  : Math.max(insets.bottom, 10),
              },
            ]}
          >
            <Text style={styles.composerLabel}>Responder</Text>
            <View style={styles.composer}>
              <TextInput
                ref={inputRef}
                style={styles.composerInput}
                placeholder="Escreva sua resposta..."
                placeholderTextColor={Colors.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={4000}
                editable={!isSending}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!replyText.trim() || isSending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || isSending}
                accessibilityRole="button"
                accessibilityLabel="Enviar resposta"
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Send size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '100%',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  bubbleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  bubbleTitleMine: {
    color: Colors.white,
  },
  bubbleBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  bubbleBodyMine: {
    color: Colors.white,
  },
  bubbleTime: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textMuted,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  composerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 2,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Message, messagesService, MessageType } from '@/services/messages';
import { Aviso, avisosService } from '@/services/avisos';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Circle, Filter, Megaphone, Search, Send, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type FilterType = 'all' | 'unread' | 'read';
type TabType = 'mensagens' | 'avisos';

export default function Messages() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isLoadingAuth, user } = useAuth();
  const { students, selectedStudent, setSelectedStudent } = useStudent();
  const [activeTab, setActiveTab] = useState<TabType>('mensagens');
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Estado dos avisos
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisosPage, setAvisosPage] = useState(1);
  const [avisosMeta, setAvisosMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [isLoadingAvisos, setIsLoadingAvisos] = useState(false);
  const [isRefreshingAvisos, setIsRefreshingAvisos] = useState(false);
  const [isLoadingMoreAvisos, setIsLoadingMoreAvisos] = useState(false);
  const [avisosError, setAvisosError] = useState<string | null>(null);

  // Proteção: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  // Carrega mensagens
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { aluno_id?: string; lida?: boolean } = {};

      // Usa o aluno selecionado do contexto global
      if (selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const messagesList = await messagesService.getMessages(params);
      setMessages(messagesList);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar as mensagens. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent]);

  // Atualiza mensagens filtradas quando mensagens, filtro ou busca mudam
  useEffect(() => {
    let filtered = [...messages];

    // Aplica filtro de lida/não lida
    if (filterType === 'unread') {
      filtered = filtered.filter(msg => !msg.lida);
    } else if (filterType === 'read') {
      filtered = filtered.filter(msg => msg.lida);
    }

    // Aplica busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        msg =>
          msg.titulo.toLowerCase().includes(query) ||
          msg.conteudo.toLowerCase().includes(query)
      );
    }

    // Ordena por data (mais recentes primeiro)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    setFilteredMessages(filtered);
  }, [messages, filterType, searchQuery]);

  // Carrega mensagens ao montar o componente e quando aluno selecionado muda
  useEffect(() => {
    if (isAuthenticated) {
      loadMessages();
    }
  }, [isAuthenticated, selectedStudent, loadMessages]);

  // Marca avisos como vistos ao abrir a tela (para o indicador "novo" na home)
  useEffect(() => {
    if (isAuthenticated) {
      avisosService.setLastSeenAvisosAt();
    }
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  }, [loadMessages]);

  // Carrega avisos (lista paginada)
  const loadAvisos = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setAvisosError(null);
      if (page === 1) {
        if (append) setIsLoadingMoreAvisos(true);
        else setIsLoadingAvisos(true);
      } else {
        setIsLoadingMoreAvisos(true);
      }
      const res = await avisosService.getAvisos({ page });
      if (page === 1) {
        setAvisos(res.avisos);
        setAvisosPage(1);
      } else {
        setAvisos(prev => [...prev, ...res.avisos]);
      }
      setAvisosMeta(res.meta);
      setAvisosPage(res.meta.current_page);
    } catch (error: any) {
      const msg = error?.message || 'Não foi possível carregar os avisos.';
      if (msg.includes('Acesso negado') || msg.toLowerCase().includes('permissão')) {
        setAvisosError('Avisos não disponíveis para seu perfil.');
      } else {
        setAvisosError(msg);
      }
      if (page === 1) setAvisos([]);
    } finally {
      setIsLoadingAvisos(false);
      setIsRefreshingAvisos(false);
      setIsLoadingMoreAvisos(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'avisos' && isAuthenticated) {
      loadAvisos(1, false);
    }
  }, [activeTab, isAuthenticated, loadAvisos]);

  const handleRefreshAvisos = useCallback(async () => {
    setIsRefreshingAvisos(true);
    await loadAvisos(1, false);
  }, [loadAvisos]);

  const handleLoadMoreAvisos = useCallback(() => {
    if (!avisosMeta || avisosMeta.current_page >= avisosMeta.last_page || isLoadingMoreAvisos) return;
    loadAvisos(avisosMeta.current_page + 1, true);
  }, [avisosMeta, isLoadingMoreAvisos, loadAvisos]);

  const handleMessagePress = async (message: Message) => {
    try {
      // Marca como lida se ainda não estiver lida
      if (!message.lida) {
        await messagesService.markAsRead(message.id);
        // Atualiza a mensagem localmente
        setMessages(prev =>
          prev.map(msg =>
            msg.id === message.id ? { ...msg, lida: true, lida_em: new Date().toISOString() } : msg
          )
        );
      }

      // Navega para detalhes da mensagem
      router.push({
        pathname: '/message-detail',
        params: { messageId: message.id },
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível abrir a mensagem.');
    }
  };

  const handleDeleteMessage = (messageId: string, messageTitle: string) => {
    Alert.alert(
      'Excluir Mensagem',
      `Tem certeza que deseja excluir a mensagem "${messageTitle}"? Esta ação não pode ser desfeita.`,
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
              await messagesService.deleteMessage(messageId);
              // Remove a mensagem da lista localmente
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
              Alert.alert('Sucesso', 'Mensagem excluída com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao excluir mensagem');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Ontem ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
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

  const getUnreadCount = (): number => {
    return messages.filter(msg => !msg.lida).length;
  };

  // Se não estiver autenticado ou ainda estiver carregando, mostra loading
  if (isLoadingAuth || !isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
        <Text style={styles.headerTitle}>Mensagens</Text>
        {user?.type === 'teacher' ? (
          <TouchableOpacity
            onPress={() => router.push('/send-message')}
            style={styles.sendButton}
          >
            <Send size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Abas Mensagens / Avisos */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mensagens' && styles.tabActive]}
          onPress={() => setActiveTab('mensagens')}
        >
          <Text style={[styles.tabText, activeTab === 'mensagens' && styles.tabTextActive]}>
            Mensagens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'avisos' && styles.tabActive]}
          onPress={() => setActiveTab('avisos')}
        >
          <Megaphone size={18} color={activeTab === 'avisos' ? Colors.white : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'avisos' && styles.tabTextActive]}>
            Avisos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros e busca (apenas na aba Mensagens) */}
      {activeTab === 'mensagens' && (
      <View style={styles.filtersContainer}>
        <View style={styles.searchWrapper}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mensagens..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtros rápidos */}
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilterType('unread')}
          >
            <Text style={[styles.filterButtonText, filterType === 'unread' && styles.filterButtonTextActive]}>
              Não lidas ({getUnreadCount()})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'read' && styles.filterButtonActive]}
            onPress={() => setFilterType('read')}
          >
            <Text style={[styles.filterButtonText, filterType === 'read' && styles.filterButtonTextActive]}>
              Lidas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seletor de aluno (se houver múltiplos alunos) */}
        {students.length > 1 && (
          <TouchableOpacity
            style={styles.studentFilter}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color={Colors.textMuted} />
            <Text style={styles.studentFilterText}>
              {selectedStudent
                ? selectedStudent.nome_social || selectedStudent.nome
                : 'Todos os alunos'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* Conteúdo: Lista de mensagens ou Lista de avisos */}
      {activeTab === 'mensagens' && (
      <>
      {/* Lista de mensagens */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando mensagens...</Text>
        </View>
      ) : filteredMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {searchQuery || filterType !== 'all'
              ? 'Nenhuma mensagem encontrada'
              : 'Nenhuma mensagem ainda'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterType !== 'all'
              ? 'Tente ajustar os filtros ou busca'
              : 'As mensagens aparecerão aqui quando chegarem'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredMessages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageCard,
                !msg.lida && styles.messageCardUnread,
              ]}
            >
              <TouchableOpacity
                style={styles.messageCardContent}
                onPress={() => handleMessagePress(msg)}
              >
                <MessageIcon tipo={msg.tipo} />
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text
                      style={[
                        styles.messageTitle,
                        !msg.lida && styles.messageTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {msg.titulo}
                    </Text>
                    {!msg.lida && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {msg.conteudo}
                  </Text>
                  <View style={styles.messageFooter}>
                    <View style={styles.messageMeta}>
                      <Text style={styles.messageType}>{msg.tipo}</Text>
                      {msg.prioridade !== 'normal' && (
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(msg.prioridade) + '20' }]}>
                          <Text style={[styles.priorityText, { color: getPriorityColor(msg.prioridade) }]}>
                            {msg.prioridade}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.messageTime}>{formatDate(msg.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.messageStatus}>
                  {msg.lida ? (
                    <CheckCircle2 size={20} color={Colors.success} />
                  ) : (
                    <Circle size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
              {user?.type === 'teacher' && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteMessage(msg.id, msg.titulo)}
                >
                  <Trash2 size={18} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      </>
      )}

      {/* Lista de avisos */}
      {activeTab === 'avisos' && (
        <>
          {isLoadingAvisos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Carregando avisos...</Text>
            </View>
          ) : avisosError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{avisosError}</Text>
              <Text style={styles.emptySubtext}>
                Os avisos da escola aparecem aqui para responsáveis e professores.
              </Text>
            </View>
          ) : avisos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📢</Text>
              <Text style={styles.emptyText}>Nenhum aviso</Text>
              <Text style={styles.emptySubtext}>
                Os avisos da escola aparecerão aqui quando forem publicados.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshingAvisos} onRefresh={handleRefreshAvisos} />
              }
            >
              {avisos.map((aviso) => (
                <TouchableOpacity
                  key={aviso.id}
                  style={styles.messageCard}
                  onPress={() => router.push({ pathname: '/aviso-detail', params: { avisoId: aviso.id } })}
                >
                  <View style={styles.messageCardContent}>
                    <Text style={styles.avisoIcon}>📢</Text>
                    <View style={styles.messageContent}>
                      <View style={styles.messageHeader}>
                        <Text style={[styles.messageTitle, styles.messageTitleUnread]} numberOfLines={1}>
                          {aviso.titulo}
                        </Text>
                      </View>
                      <Text style={styles.messagePreview} numberOfLines={2}>
                        {aviso.conteudo}
                      </Text>
                      <View style={styles.messageFooter}>
                        <View style={styles.messageMeta}>
                          {aviso.tenant?.nome && (
                            <Text style={styles.messageType}>{aviso.tenant.nome}</Text>
                          )}
                          {aviso.prioridade !== 'normal' && (
                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(aviso.prioridade) + '20' }]}>
                              <Text style={[styles.priorityText, { color: getPriorityColor(aviso.prioridade) }]}>
                                {aviso.prioridade}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.messageTime}>
                          {formatDate(aviso.publicado_em || aviso.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {avisosMeta && avisosMeta.current_page < avisosMeta.last_page && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMoreAvisos}
                  disabled={isLoadingMoreAvisos}
                >
                  {isLoadingMoreAvisos ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Carregar mais avisos</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </>
      )}

      <BottomNav />

      {/* Modal de seleção de aluno */}
      {showFilterModal && students.length > 1 && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por aluno</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentOption,
                    selectedStudent?.id === student.id && styles.studentOptionSelected,
                  ]}
                  onPress={async () => {
                    await setSelectedStudent(student);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.studentOptionName}>
                    {student.nome_social || student.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  sendButton: {
    padding: 8,
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    gap: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  filtersContainer: {
    padding: 16,
    gap: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Colors.text,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  studentFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  studentFilterText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  messageCardUnread: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary + '33',
  },
  messageCardContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  messageIcon: {
    fontSize: 28,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  messageTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  messageTitleUnread: {
    color: Colors.text,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  messagePreview: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageType: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  messageStatus: {
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  studentOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentOptionSelected: {
    backgroundColor: Colors.background,
  },
  studentOptionName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  avisoIcon: {
    fontSize: 28,
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loadMoreText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});

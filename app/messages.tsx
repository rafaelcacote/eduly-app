import { AppHeader, AppHeaderAction } from '@/components/AppHeader';
import { AuthorRow } from '@/components/AuthorSpeech';
import BottomNav from '@/components/BottomNav';
import { PulsingDot } from '@/components/PulsingDot';
import { MESSAGE_TYPE_LABELS } from '@/components/TypeIcon';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { Aviso, avisosService } from '@/services/avisos';
import type { MessageAuthor } from '@/services/authors';
import { Conversation, messagesService } from '@/services/messages';
import { StudentTeacher, studentsService } from '@/services/students';
import { useRouter } from 'expo-router';
import { CheckCircle2, Filter, Inbox, Megaphone, MessageCircle, Search, Send, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
type TabType = 'recados' | 'comunicados';
type FilterModalType = 'student' | 'teacher' | null;

const MESSAGES_PAGE_SIZE = 15;

function getConversationAuthors(msg: Conversation): MessageAuthor[] {
  const authors: MessageAuthor[] = [];
  const push = (author?: MessageAuthor | null) => {
    if (author?.id && !authors.some((item) => item.id === author.id)) {
      authors.push(author);
    }
  };

  push(msg.remetente);
  push(msg.destinatario);
  push(msg.ultima_mensagem?.remetente);
  push(msg.ultima_mensagem?.destinatario);
  (msg.participantes || []).forEach(push);

  return authors;
}

function conversationMatchesTeacher(msg: Conversation, teacher: StudentTeacher): boolean {
  const ids = new Set<string>();
  ids.add(teacher.id);
  if (teacher.usuario_id) ids.add(teacher.usuario_id);

  return getConversationAuthors(msg).some((author) => ids.has(author.id));
}

function getTeacherFromConversation(
  msg: Conversation,
  professores: StudentTeacher[],
  currentUserId?: string | null
): MessageAuthor | null {
  const authors = getConversationAuthors(msg);

  if (professores.length > 0) {
    const teacherIds = new Set<string>();
    professores.forEach((item) => {
      teacherIds.add(item.id);
      if (item.usuario_id) teacherIds.add(item.usuario_id);
    });
    const matched = authors.find((author) => teacherIds.has(author.id));
    if (matched) return matched;
  }

  const other = authors.find((author) => author.id !== currentUserId);
  return other || msg.remetente || msg.ultima_mensagem?.remetente || null;
}

export default function Messages() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isLoadingAuth, user } = useAuth();
  const { students, selectedStudent, setSelectedStudent } = useStudent();
  const [activeTab, setActiveTab] = useState<TabType>('recados');
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Conversation[]>([]);
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterModal, setFilterModal] = useState<FilterModalType>(null);
  const [professores, setProfessores] = useState<StudentTeacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisosMeta, setAvisosMeta] = useState<{
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  } | null>(null);
  const [isLoadingAvisos, setIsLoadingAvisos] = useState(false);
  const [isRefreshingAvisos, setIsRefreshingAvisos] = useState(false);
  const [isLoadingMoreAvisos, setIsLoadingMoreAvisos] = useState(false);
  const [avisosError, setAvisosError] = useState<string | null>(null);
  const [lastSeenAvisosAt, setLastSeenAvisosAt] = useState<string | null>(null);

  const isParent = user?.type === 'responsavel';
  const selectedTeacher = useMemo(
    () => professores.find((item) => item.id === selectedTeacherId) || null,
    [professores, selectedTeacherId]
  );
  const visibleMessages = useMemo(
    () => filteredMessages.slice(0, visibleCount),
    [filteredMessages, visibleCount]
  );
  const hasMoreMessages = visibleCount < filteredMessages.length;

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { aluno_id?: string; lida?: boolean } = {};

      if (selectedStudent?.id) {
        params.aluno_id = selectedStudent.id;
      }

      const messagesList = await messagesService.getMessages(params);
      setMessages(messagesList);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar os recados. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent]);

  const loadProfessores = useCallback(async () => {
    if (!isParent) {
      setProfessores([]);
      setSelectedTeacherId(null);
      return;
    }

    const alunoId = selectedStudent?.id || students[0]?.id;
    if (!alunoId) {
      setProfessores([]);
      setSelectedTeacherId(null);
      return;
    }

    try {
      const list = await studentsService.getTeachers(alunoId);
      setProfessores(list);
      setSelectedTeacherId((current) =>
        current && list.some((item) => item.id === current) ? current : null
      );
    } catch {
      setProfessores([]);
      setSelectedTeacherId(null);
    }
  }, [isParent, selectedStudent?.id, students]);

  useEffect(() => {
    let filtered = [...messages];

    if (filterType === 'unread') {
      filtered = filtered.filter((msg) => (msg.unread_count ?? (msg.lida ? 0 : 1)) > 0);
    } else if (filterType === 'read') {
      filtered = filtered.filter((msg) => (msg.unread_count ?? (msg.lida ? 0 : 1)) === 0);
    }

    if (selectedTeacher) {
      filtered = filtered.filter((msg) => conversationMatchesTeacher(msg, selectedTeacher));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          (msg.titulo || '').toLowerCase().includes(query) ||
          (msg.conteudo || '').toLowerCase().includes(query) ||
          (msg.ultima_mensagem?.titulo || '').toLowerCase().includes(query) ||
          (msg.ultima_mensagem?.conteudo || '').toLowerCase().includes(query) ||
          getConversationAuthors(msg).some((author) =>
            (author.nome_completo || '').toLowerCase().includes(query)
          )
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || a.ultima_mensagem?.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || b.ultima_mensagem?.created_at || 0).getTime();
      return dateB - dateA;
    });

    setFilteredMessages(filtered);
    setVisibleCount(MESSAGES_PAGE_SIZE);
  }, [messages, filterType, searchQuery, selectedTeacher]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages();
    }
  }, [isAuthenticated, selectedStudent, loadMessages]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfessores();
    }
  }, [isAuthenticated, loadProfessores]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    (async () => {
      const lastSeen = await avisosService.getLastSeenAvisosAt();
      if (!cancelled) setLastSeenAvisosAt(lastSeen);
      await avisosService.setLastSeenAvisosAt();
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  }, [loadMessages]);

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
      } else {
        setAvisos((prev) => [...prev, ...res.avisos]);
      }
      setAvisosMeta(res.meta);
    } catch (error: any) {
      const msg = error?.message || 'Não foi possível carregar os comunicados.';
      if (msg.includes('Acesso negado') || msg.toLowerCase().includes('permissão')) {
        setAvisosError('Comunicados não disponíveis para seu perfil.');
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
    if (activeTab === 'comunicados' && isAuthenticated) {
      loadAvisos(1, false);
    }
  }, [activeTab, isAuthenticated, loadAvisos]);

  const handleRefreshAvisos = useCallback(async () => {
    setIsRefreshingAvisos(true);
    await loadAvisos(1, false);
  }, [loadAvisos]);

  const handleLoadMoreAvisos = useCallback(() => {
    if (!avisosMeta || avisosMeta.current_page >= avisosMeta.last_page || isLoadingMoreAvisos) {
      return;
    }
    loadAvisos(avisosMeta.current_page + 1, true);
  }, [avisosMeta, isLoadingMoreAvisos, loadAvisos]);

  const handleMessagePress = async (conversation: Conversation) => {
    const conversaId = conversation.conversa_id || conversation.id;
    const messageId = conversation.id || conversation.ultima_mensagem?.id;

    try {
      if (conversaId && (conversation.unread_count ?? 0) > 0) {
        await messagesService.markConversationAsRead(conversaId);
        setMessages((prev) =>
          prev.map((msg) =>
            (msg.conversa_id || msg.id) === conversaId
              ? { ...msg, lida: true, unread_count: 0 }
              : msg
          )
        );
      }

      router.push({
        pathname: '/message-detail',
        params: {
          ...(conversaId ? { conversaId } : {}),
          ...(messageId ? { messageId } : {}),
        },
      });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível abrir a conversa.');
    }
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
    }
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getPriorityColor = (prioridade: string): string => {
    if (prioridade === 'alta') return Colors.error;
    if (prioridade === 'media') return Colors.warning;
    return Colors.textMuted;
  };

  const getUnreadCount = (): number => {
    return messages.reduce((total, msg) => total + (msg.unread_count ?? (msg.lida ? 0 : 1)), 0);
  };

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const tabHint =
    activeTab === 'recados'
      ? 'Direcionados ao aluno ou responsável'
      : 'Publicados pela escola para todos';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Comunicação"
        right={
          user?.type === 'teacher' ? (
            <AppHeaderAction
              onPress={() => router.push('/send-message')}
              accessibilityLabel="Enviar recado"
            >
              <Send size={18} color={Colors.white} />
            </AppHeaderAction>
          ) : user?.type === 'responsavel' ? (
            <AppHeaderAction
              onPress={() => router.push('/send-message-parent')}
              accessibilityLabel="Enviar mensagem ao professor"
            >
              <Send size={18} color={Colors.white} />
            </AppHeaderAction>
          ) : undefined
        }
      />

      <View style={styles.tabSection}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'recados' && styles.segmentActive]}
            onPress={() => setActiveTab('recados')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'recados' }}
          >
            <MessageCircle
              size={16}
              color={activeTab === 'recados' ? Colors.white : Colors.textMuted}
              strokeWidth={2.25}
            />
            <Text style={[styles.segmentText, activeTab === 'recados' && styles.segmentTextActive]}>
              Recados
            </Text>
            {getUnreadCount() > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  activeTab === 'recados' && styles.segmentBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBadgeText,
                    activeTab === 'recados' && styles.segmentBadgeTextActive,
                  ]}
                >
                  {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'comunicados' && styles.segmentActiveComunicado]}
            onPress={() => setActiveTab('comunicados')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'comunicados' }}
          >
            <Megaphone
              size={16}
              color={activeTab === 'comunicados' ? Colors.white : Colors.textMuted}
              strokeWidth={2.25}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'comunicados' && styles.segmentTextActive,
              ]}
            >
              Comunicados
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabHintRow}>
          {activeTab === 'recados' ? (
            <MessageCircle size={14} color={Colors.primary} strokeWidth={2.25} />
          ) : (
            <Users size={14} color="#0f766e" strokeWidth={2.25} />
          )}
          <Text
            style={[
              styles.tabHint,
              activeTab === 'comunicados' && styles.tabHintComunicado,
            ]}
          >
            {tabHint}
          </Text>
        </View>
      </View>

      {activeTab === 'recados' && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchWrapper}>
            <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar recados..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterType('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'all' && styles.filterButtonTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'unread' && styles.filterButtonActive]}
              onPress={() => setFilterType('unread')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'unread' && styles.filterButtonTextActive,
                ]}
              >
                Não lidos ({getUnreadCount()})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'read' && styles.filterButtonActive]}
              onPress={() => setFilterType('read')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'read' && styles.filterButtonTextActive,
                ]}
              >
                Lidos
              </Text>
            </TouchableOpacity>
          </View>

          {students.length > 1 && (
            <TouchableOpacity
              style={styles.studentFilter}
              onPress={() => setFilterModal('student')}
            >
              <Filter size={16} color={Colors.textMuted} />
              <Text style={styles.studentFilterText}>
                {selectedStudent
                  ? selectedStudent.nome_social || selectedStudent.nome
                  : 'Todos os alunos'}
              </Text>
            </TouchableOpacity>
          )}

          {isParent && professores.length > 0 && (
            <TouchableOpacity
              style={styles.studentFilter}
              onPress={() => setFilterModal('teacher')}
            >
              <Users size={16} color={Colors.textMuted} />
              <Text style={styles.studentFilterText}>
                {selectedTeacher ? selectedTeacher.nome_completo : 'Todos os professores'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'recados' && (
        <>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Carregando recados...</Text>
            </View>
          ) : filteredMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Inbox size={32} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery || filterType !== 'all' || selectedTeacher
                  ? 'Nenhum recado encontrado'
                  : 'Nenhum recado ainda'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || filterType !== 'all' || selectedTeacher
                  ? 'Tente ajustar os filtros ou a busca'
                  : 'Recados enviados para o aluno ou responsável aparecem aqui'}
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
              {visibleMessages.map((msg) => {
                const unread = msg.unread_count ?? (msg.lida ? 0 : 1);
                const title = msg.titulo || msg.ultima_mensagem?.titulo || 'Conversa';
                const preview = msg.conteudo || msg.ultima_mensagem?.conteudo || '';
                const author = isParent
                  ? getTeacherFromConversation(msg, professores, user?.id)
                  : msg.remetente || msg.ultima_mensagem?.remetente;
                const createdAt =
                  msg.updated_at ||
                  msg.ultima_mensagem?.created_at ||
                  msg.created_at ||
                  new Date().toISOString();
                const tipo = msg.tipo || msg.ultima_mensagem?.tipo || 'informativo';
                const prioridade = msg.prioridade || msg.ultima_mensagem?.prioridade || 'normal';
                const messagesCount = msg.messages_count || 1;

                return (
                <View
                  key={msg.conversa_id || msg.id}
                  style={[styles.messageCard, unread > 0 && styles.messageCardUnread]}
                >
                  <TouchableOpacity
                    style={styles.messageCardContent}
                    onPress={() => handleMessagePress(msg)}
                  >
                    <View style={styles.messageContent}>
                      <AuthorRow
                        author={author}
                        tone="recado"
                        asRecadoDaProf={isParent}
                      />
                      <View style={styles.messageHeader}>
                        <View style={styles.channelChip}>
                          <Text style={styles.channelChipText}>
                            {messagesCount > 1 ? 'Conversa' : 'Recado'}
                          </Text>
                        </View>
                        {unread > 0 && <PulsingDot size={8} />}
                        {messagesCount > 1 && (
                          <View style={styles.threadCountChip}>
                            <Text style={styles.threadCountText}>{messagesCount} msgs</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.messageTitle, unread > 0 && styles.messageTitleUnread]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text style={styles.messagePreview} numberOfLines={2}>
                        {preview}
                      </Text>
                      <View style={styles.messageFooter}>
                        <View style={styles.messageMeta}>
                          <Text style={styles.messageType}>
                            {MESSAGE_TYPE_LABELS[tipo] ?? tipo}
                          </Text>
                          {prioridade !== 'normal' && (
                            <View
                              style={[
                                styles.priorityBadge,
                                { backgroundColor: getPriorityColor(prioridade) + '20' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityText,
                                  { color: getPriorityColor(prioridade) },
                                ]}
                              >
                                {prioridade}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.messageTime}>{formatDate(createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.messageStatus}>
                      {unread > 0 ? (
                        <View style={styles.unreadCountBadge}>
                          <Text style={styles.unreadCountText}>
                            {unread > 99 ? '99+' : unread}
                          </Text>
                        </View>
                      ) : (
                        <CheckCircle2 size={20} color={Colors.success} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                );
              })}
              {hasMoreMessages && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() =>
                    setVisibleCount((current) =>
                      Math.min(current + MESSAGES_PAGE_SIZE, filteredMessages.length)
                    )
                  }
                >
                  <Text style={styles.loadMoreText}>
                    Carregar mais recados ({filteredMessages.length - visibleCount} restantes)
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </>
      )}

      {activeTab === 'comunicados' && (
        <>
          {isLoadingAvisos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text style={styles.loadingText}>Carregando comunicados...</Text>
            </View>
          ) : avisosError ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, styles.emptyIconWrapComunicado]}>
                <Megaphone size={32} color="#0f766e" strokeWidth={2} />
              </View>
              <Text style={styles.emptyText}>{avisosError}</Text>
              <Text style={styles.emptySubtext}>
                Comunicados da escola aparecem aqui para responsáveis e professores.
              </Text>
            </View>
          ) : avisos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, styles.emptyIconWrapComunicado]}>
                <Megaphone size={32} color="#0f766e" strokeWidth={2} />
              </View>
              <Text style={styles.emptyText}>Nenhum comunicado</Text>
              <Text style={styles.emptySubtext}>
                Quando a escola publicar um comunicado para todos, ele aparece aqui.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingAvisos}
                  onRefresh={handleRefreshAvisos}
                  tintColor="#0f766e"
                />
              }
            >
              {avisos.map((aviso) => (
                <TouchableOpacity
                  key={aviso.id}
                  style={[styles.messageCard, styles.comunicadoCard]}
                  onPress={() =>
                    router.push({ pathname: '/aviso-detail', params: { avisoId: aviso.id } })
                  }
                >
                  <View style={styles.comunicadoAccent} />
                  <View style={styles.messageCardContent}>
                    <View style={styles.messageContent}>
                      <AuthorRow author={aviso.criado_por} tone="comunicado" />
                      <View style={styles.messageHeader}>
                        <View style={[styles.channelChip, styles.channelChipComunicado]}>
                          <Text style={[styles.channelChipText, styles.channelChipTextComunicado]}>
                            Comunicado
                          </Text>
                        </View>
                        {avisosService.isAvisoNew(aviso, lastSeenAvisosAt) && (
                          <PulsingDot size={8} color="#0f766e" />
                        )}
                      </View>
                      <Text style={[styles.messageTitle, styles.messageTitleUnread]} numberOfLines={1}>
                        {aviso.titulo}
                      </Text>
                      <Text style={styles.messagePreview} numberOfLines={2}>
                        {aviso.conteudo}
                      </Text>
                      <View style={styles.messageFooter}>
                        <View style={styles.messageMeta}>
                          {aviso.tenant?.nome && (
                            <Text style={styles.messageType}>{aviso.tenant.nome}</Text>
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
                    <ActivityIndicator size="small" color="#0f766e" />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: '#0f766e' }]}>
                      Carregar mais comunicados
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </>
      )}

      <BottomNav />

      {filterModal === 'student' && students.length > 1 && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por aluno</Text>
              <TouchableOpacity onPress={() => setFilterModal(null)}>
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
                    setSelectedTeacherId(null);
                    setFilterModal(null);
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

      {filterModal === 'teacher' && isParent && professores.length > 0 && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por professor</Text>
              <TouchableOpacity onPress={() => setFilterModal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[
                  styles.studentOption,
                  selectedTeacherId === null && styles.studentOptionSelected,
                ]}
                onPress={() => {
                  setSelectedTeacherId(null);
                  setFilterModal(null);
                }}
              >
                <Text style={styles.studentOptionName}>Todos os professores</Text>
              </TouchableOpacity>
              {professores.map((professor) => {
                const disciplinas = (professor.disciplinas || [])
                  .map((item) => item.nome)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <TouchableOpacity
                    key={professor.id}
                    style={[
                      styles.studentOption,
                      selectedTeacherId === professor.id && styles.studentOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedTeacherId(professor.id);
                      setFilterModal(null);
                    }}
                  >
                    <Text style={styles.studentOptionName}>{professor.nome_completo}</Text>
                    {!!disciplinas && (
                      <Text style={styles.teacherOptionSubtitle}>{disciplinas}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
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
  tabSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentActiveComunicado: {
    backgroundColor: '#0f766e',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  segmentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  segmentBadgeActive: {
    backgroundColor: Colors.white,
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  segmentBadgeTextActive: {
    color: Colors.primary,
  },
  tabHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  tabHint: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  tabHintComunicado: {
    color: '#0f766e',
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
  comunicadoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  comunicadoAccent: {
    width: 4,
    backgroundColor: '#0f766e',
  },
  messageCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  channelChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelChipComunicado: {
    backgroundColor: '#ccfbf1',
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  channelChipTextComunicado: {
    color: '#0f766e',
  },
  threadCountChip: {
    backgroundColor: Colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  threadCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unreadCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
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
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconWrapComunicado: {
    backgroundColor: '#f0fdfa',
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
  teacherOptionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
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

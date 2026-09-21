import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { StudentAvatar } from '@/components/StudentAvatar';
import { SuccessModal } from '@/components/SuccessModal';
import { MESSAGE_TYPE_LABELS, TypeIcon } from '@/components/TypeIcon';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import { MessagePriority, MessageType, messagesService } from '@/services/messages';
import { StudentTeacher, studentsService } from '@/services/students';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SendMessageParent() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    professorId?: string;
    usuarioId?: string;
    replyTitle?: string;
  }>();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { selectedStudent, students, isLoading: isLoadingStudents } = useStudent();

  const [professores, setProfessores] = useState<StudentTeacher[]>([]);
  const [selectedProfessor, setSelectedProfessor] = useState<StudentTeacher | null>(null);
  const [showProfessorSelector, setShowProfessorSelector] = useState(false);
  const [titulo, setTitulo] = useState(
    params.replyTitle ? `Re: ${String(params.replyTitle).replace(/^Re:\s*/i, '')}` : ''
  );
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<MessageType>('informativo');
  const [prioridade, setPrioridade] = useState<MessagePriority>('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdConversaId, setCreatedConversaId] = useState<string | null>(null);
  const [createdMessageId, setCreatedMessageId] = useState<string | null>(null);

  const aluno = selectedStudent || students[0] || null;
  const alunoNome = aluno ? aluno.nome_social || aluno.nome : '';

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type === 'teacher') {
      router.replace('/send-message');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  const applyPreselection = useCallback(
    (list: StudentTeacher[]) => {
      if (list.length === 0) {
        setSelectedProfessor(null);
        return;
      }

      const byProfessorId = params.professorId
        ? list.find((item) => item.id === params.professorId)
        : undefined;
      const byUsuarioId = params.usuarioId
        ? list.find((item) => item.usuario_id === params.usuarioId)
        : undefined;

      setSelectedProfessor(byProfessorId || byUsuarioId || list[0] || null);
    },
    [params.professorId, params.usuarioId]
  );

  const loadProfessores = useCallback(async () => {
    if (!aluno?.id) {
      setProfessores([]);
      setSelectedProfessor(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const list = await studentsService.getTeachers(aluno.id);
      setProfessores(list);
      applyPreselection(list);
    } catch (error: any) {
      setProfessores([]);
      setSelectedProfessor(null);
      Alert.alert('Erro', error?.message || 'Não foi possível carregar os professores.');
    } finally {
      setIsLoading(false);
    }
  }, [aluno?.id, applyPreselection]);

  useEffect(() => {
    if (isLoadingAuth || isLoadingStudents || user?.type === 'teacher') return;
    loadProfessores();
  }, [isLoadingAuth, isLoadingStudents, user?.type, loadProfessores]);

  const professorSubtitle = useMemo(() => {
    if (!selectedProfessor) return 'Selecione um professor';

    const disciplinasLabel = (selectedProfessor.disciplinas || [])
      .map((item) => item.nome)
      .filter(Boolean)
      .join(', ');

    if (disciplinasLabel) return disciplinasLabel;
    if (selectedProfessor.especializacao) return selectedProfessor.especializacao;

    const turma = selectedProfessor.turmas?.[0];
    if (turma) {
      return turma.serie && turma.turma_letra
        ? `${turma.serie} ${turma.turma_letra}`
        : turma.nome;
    }

    return 'Professor(a) do aluno';
  }, [selectedProfessor]);

  const getProfessorDisciplinasLabel = (professor: StudentTeacher): string => {
    const disciplinasLabel = (professor.disciplinas || [])
      .map((item) => item.nome)
      .filter(Boolean)
      .join(', ');

    if (disciplinasLabel) return disciplinasLabel;
    if (professor.especializacao) return professor.especializacao;

    const turma = professor.turmas?.[0];
    if (turma) {
      return turma.serie && turma.turma_letra
        ? `${turma.serie} ${turma.turma_letra}`
        : turma.nome || 'Professor(a)';
    }

    return 'Professor(a)';
  };

  const handleSend = async () => {
    if (!aluno?.id) {
      Alert.alert('Atenção', 'Nenhum aluno selecionado na agenda.');
      return;
    }
    if (!selectedProfessor) {
      Alert.alert('Atenção', 'Selecione um professor.');
      return;
    }
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Preencha o título da mensagem.');
      return;
    }
    if (!conteudo.trim()) {
      Alert.alert('Atenção', 'Preencha o conteúdo da mensagem.');
      return;
    }

    try {
      setIsSending(true);
      const created = await messagesService.sendMessageToTeacher({
        aluno_id: aluno.id,
        professor_id: selectedProfessor.id,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        tipo,
        prioridade,
      });
      setCreatedConversaId(created.conversa_id || null);
      setCreatedMessageId(created.id);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingAuth || !isAuthenticated || isLoading || isLoadingStudents) {
    return (
      <View style={styles.container}>
        <AppHeader title="Enviar ao professor" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando professores...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Enviar ao professor"
        subtitle={alunoNome ? `Sobre ${alunoNome}` : undefined}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professor</Text>
          <Text style={styles.sectionHint}>
            A mensagem será enviada em nome de {alunoNome || 'seu aluno'} para o professor selecionado.
          </Text>

          {professores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Nenhum professor encontrado para este aluno.
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowProfessorSelector((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Selecionar professor"
              >
                <View style={styles.selectorLeft}>
                  <StudentAvatar
                    nome={selectedProfessor?.nome_completo || 'Professor'}
                    fotoUrl={selectedProfessor?.foto_url || selectedProfessor?.avatar_url}
                    size="md"
                  />
                  <View style={styles.selectorTextWrap}>
                    <Text style={styles.selectorTitle} numberOfLines={1}>
                      {selectedProfessor?.nome_completo || 'Selecione um professor'}
                    </Text>
                    <Text style={styles.selectorSubtitle} numberOfLines={1}>
                      {professorSubtitle}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {showProfessorSelector && (
                <View style={styles.optionsList}>
                  {professores.map((professor) => {
                    const isSelected = selectedProfessor?.id === professor.id;
                    return (
                      <TouchableOpacity
                        key={professor.id}
                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                        onPress={() => {
                          setSelectedProfessor(professor);
                          setShowProfessorSelector(false);
                        }}
                      >
                        <StudentAvatar
                          nome={professor.nome_completo}
                          fotoUrl={professor.foto_url || professor.avatar_url}
                          size="sm"
                          ring={isSelected}
                        />
                        <View style={styles.optionTextWrap}>
                          <Text style={styles.optionTitle} numberOfLines={1}>
                            {professor.nome_completo}
                          </Text>
                          <Text style={styles.optionSubtitle} numberOfLines={2}>
                            {getProfessorDisciplinasLabel(professor)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Dúvida sobre a prova"
            placeholderTextColor={Colors.textMuted}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mensagem *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Escreva sua mensagem para o professor"
            placeholderTextColor={Colors.textMuted}
            value={conteudo}
            onChangeText={setConteudo}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.optionsRow}>
            {(['informativo', 'atencao', 'aviso', 'lembrete'] as MessageType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeOption, tipo === t && styles.typeOptionActive]}
                onPress={() => setTipo(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: tipo === t }}
              >
                <TypeIcon kind={t} size="sm" />
                <Text style={[styles.typeOptionText, tipo === t && styles.typeOptionTextActive]}>
                  {MESSAGE_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prioridade</Text>
          <View style={styles.priorityRow}>
            {(['normal', 'media', 'alta'] as MessagePriority[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityOption, prioridade === p && styles.priorityOptionActive]}
                onPress={() => setPrioridade(p)}
              >
                <Text
                  style={[
                    styles.priorityOptionText,
                    prioridade === p && styles.priorityOptionTextActive,
                  ]}
                >
                  {p === 'normal' ? 'Normal' : p === 'media' ? 'Média' : 'Alta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (isSending || professores.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isSending || professores.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          {isSending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Send size={18} color={Colors.white} />
              <Text style={styles.sendButtonText}>Enviar mensagem</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      <SuccessModal
        visible={showSuccess}
        title="Mensagem enviada"
        message={`Sua mensagem foi enviada para ${selectedProfessor?.nome_completo || 'o professor'}.`}
        buttonLabel="Voltar para Comunicação"
        onClose={() => {
          setShowSuccess(false);
          if (createdConversaId || createdMessageId) {
            router.replace({
              pathname: '/message-detail',
              params: {
                ...(createdConversaId ? { conversaId: createdConversaId } : {}),
                ...(createdMessageId ? { messageId: createdMessageId } : {}),
              },
            });
            return;
          }
          router.replace('/messages');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  selectorButton: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  selectorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  selectorSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
  },
  optionsList: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionItemSelected: {
    backgroundColor: '#eff6ff',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 140,
    paddingTop: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#eff6ff',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  typeOptionTextActive: {
    color: Colors.primary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  priorityOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#eff6ff',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  priorityOptionTextActive: {
    color: Colors.primary,
  },
  sendButton: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

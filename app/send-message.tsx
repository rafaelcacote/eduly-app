import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { messagesService, MessageType, MessagePriority } from '@/services/messages';
import { teachersService, Turma, Aluno } from '@/services/teachers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Users, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type RecipientType = 'aluno' | 'turma';

export default function SendMessage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ alunoId?: string; alunoNome?: string }>();
  const { user } = useAuth();
  const [recipientType, setRecipientType] = useState<RecipientType>(params.alunoId ? 'aluno' : 'turma');
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<MessageType>('informativo');
  const [prioridade, setPrioridade] = useState<MessagePriority>('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showTurmaSelector, setShowTurmaSelector] = useState(false);
  const [showAlunoSelector, setShowAlunoSelector] = useState(false);

  // Carrega turmas e alunos ao montar
  useEffect(() => {
    loadData();
  }, []);

  // Carrega alunos quando turma é selecionada
  useEffect(() => {
    if (selectedTurma && recipientType === 'turma') {
      loadAlunosByTurma(selectedTurma.id);
    }
  }, [selectedTurma, recipientType]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [turmasData, alunosData] = await Promise.all([
        teachersService.getTurmas(),
        teachersService.getAllAlunos(),
      ]);
      setTurmas(turmasData);
      setAlunos(alunosData);
      
      // Se veio alunoId por parâmetro, seleciona o aluno
      if (params.alunoId && alunosData.length > 0) {
        const aluno = alunosData.find(a => a.id === params.alunoId);
        if (aluno) {
          setSelectedAluno(aluno);
          setRecipientType('aluno');
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlunosByTurma = async (turmaId: string) => {
    try {
      const alunosData = await teachersService.getAlunosByTurma(turmaId);
      setAlunos(alunosData);
    } catch (error: any) {
      console.error('Erro ao carregar alunos da turma:', error);
    }
  };

  const handleSend = async () => {
    // Validações
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o título da mensagem');
      return;
    }

    if (!conteudo.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o conteúdo da mensagem');
      return;
    }

    if (recipientType === 'turma' && !selectedTurma) {
      Alert.alert('Atenção', 'Por favor, selecione uma turma');
      return;
    }

    if (recipientType === 'aluno' && !selectedAluno) {
      Alert.alert('Atenção', 'Por favor, selecione um aluno');
      return;
    }

    try {
      setIsSending(true);

      if (recipientType === 'turma' && selectedTurma) {
        await messagesService.sendMessageToClass({
          turma_id: selectedTurma.id,
          titulo: titulo.trim(),
          conteudo: conteudo.trim(),
          tipo,
          prioridade,
        });
        Alert.alert('Sucesso', 'Mensagem enviada para a turma com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (recipientType === 'aluno' && selectedAluno) {
        await messagesService.sendMessageToStudent({
          aluno_id: selectedAluno.id,
          titulo: titulo.trim(),
          conteudo: conteudo.trim(),
          tipo,
          prioridade,
        });
        Alert.alert('Sucesso', 'Mensagem enviada para o aluno com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enviar Mensagem</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enviar Mensagem</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Seletor de tipo de destinatário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinatário</Text>
          <View style={styles.recipientTypeSelector}>
            <TouchableOpacity
              style={[
                styles.recipientTypeButton,
                recipientType === 'turma' && styles.recipientTypeButtonActive,
              ]}
              onPress={() => {
                setRecipientType('turma');
                setSelectedAluno(null);
              }}
            >
              <Users size={20} color={recipientType === 'turma' ? Colors.white : Colors.text} />
              <Text
                style={[
                  styles.recipientTypeText,
                  recipientType === 'turma' && styles.recipientTypeTextActive,
                ]}
              >
                Turma
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.recipientTypeButton,
                recipientType === 'aluno' && styles.recipientTypeButtonActive,
              ]}
              onPress={() => {
                setRecipientType('aluno');
                setSelectedTurma(null);
              }}
            >
              <User size={20} color={recipientType === 'aluno' ? Colors.white : Colors.text} />
              <Text
                style={[
                  styles.recipientTypeText,
                  recipientType === 'aluno' && styles.recipientTypeTextActive,
                ]}
              >
                Aluno Específico
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seletor de turma */}
          {recipientType === 'turma' && (
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowTurmaSelector(true)}
            >
              <Text style={styles.selectorButtonText}>
                {selectedTurma ? `${selectedTurma.serie} ${selectedTurma.turma_letra}` : 'Selecione uma turma'}
              </Text>
              <Text style={styles.selectorButtonArrow}>▼</Text>
            </TouchableOpacity>
          )}

          {/* Seletor de aluno */}
          {recipientType === 'aluno' && (
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowAlunoSelector(true)}
            >
              <Text style={styles.selectorButtonText}>
                {selectedAluno ? selectedAluno.nome_social || selectedAluno.nome : 'Selecione um aluno'}
              </Text>
              <Text style={styles.selectorButtonArrow}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Formulário */}
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o título da mensagem"
            placeholderTextColor={Colors.textMuted}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Conteúdo *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite o conteúdo da mensagem"
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
                style={[styles.optionButton, tipo === t && styles.optionButtonActive]}
                onPress={() => setTipo(t)}
              >
                <Text style={[styles.optionText, tipo === t && styles.optionTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prioridade</Text>
          <View style={styles.optionsRow}>
            {(['normal', 'media', 'alta'] as MessagePriority[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.optionButton, prioridade === p && styles.optionButtonActive]}
                onPress={() => setPrioridade(p)}
              >
                <Text style={[styles.optionText, prioridade === p && styles.optionTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Send size={20} color={Colors.white} />
              <Text style={styles.sendButtonText}>Enviar Mensagem</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      {/* Modal de seleção de turma */}
      {showTurmaSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Turma</Text>
              <TouchableOpacity onPress={() => setShowTurmaSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {turmas.map((turma) => (
                <TouchableOpacity
                  key={turma.id}
                  style={[
                    styles.modalOption,
                    selectedTurma?.id === turma.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTurma(turma);
                    setShowTurmaSelector(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{turma.serie} {turma.turma_letra}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal de seleção de aluno */}
      {showAlunoSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Aluno</Text>
              <TouchableOpacity onPress={() => setShowAlunoSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {alunos.map((aluno) => (
                <TouchableOpacity
                  key={aluno.id}
                  style={[
                    styles.modalOption,
                    selectedAluno?.id === aluno.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedAluno(aluno);
                    setShowAlunoSelector(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {aluno.nome_social || aluno.nome}
                    {aluno.turma_nome && ` - ${aluno.turma_nome}`}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  recipientTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  recipientTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  recipientTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recipientTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recipientTypeTextActive: {
    color: Colors.white,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  selectorButtonArrow: {
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.white,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
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
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.background,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
});

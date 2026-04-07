import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { testsService, Test } from '@/services/tests';
import { teachersService, Disciplina, Turma } from '@/services/teachers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, Save } from 'lucide-react-native';
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
// Usando input de data nativo

export default function CreateExam() {
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string }>();
  const { user } = useAuth();
  const isEditing = !!params.testId;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [dataProva, setDataProva] = useState(new Date());
  const [horario, setHorario] = useState('');
  const [sala, setSala] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisciplinaSelector, setShowDisciplinaSelector] = useState(false);
  const [showTurmaSelector, setShowTurmaSelector] = useState(false);

  useEffect(() => {
    loadData();
    if (isEditing && params.testId) {
      loadTest(params.testId);
    }
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [disciplinasData, turmasData] = await Promise.all([
        teachersService.getDisciplinas(),
        teachersService.getTurmas(),
      ]);
      setDisciplinas(disciplinasData);
      setTurmas(turmasData);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTest = async (id: string) => {
    try {
      setIsLoading(true);
      const test = await testsService.getTestById(id);
      setTitulo(test.titulo);
      setDescricao(test.descricao || '');
      setDataProva(new Date(test.data_prova));
      setHorario(test.horario || '');
      setSala(test.sala || '');
      setDuracaoMinutos(test.duracao_minutos?.toString() || '');
      
      // Encontra disciplina e turma correspondentes
      if (test.disciplina.id) {
        const disciplina = disciplinas.find(d => d.id === test.disciplina.id);
        if (disciplina) setSelectedDisciplina(disciplina);
      }
      if (test.turma.id) {
        const turma = turmas.find(t => t.id === test.turma.id);
        if (turma) setSelectedTurma(turma);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar prova');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o título da prova');
      return;
    }

    if (!selectedDisciplina) {
      Alert.alert('Atenção', 'Por favor, selecione uma disciplina');
      return;
    }

    if (!selectedTurma) {
      Alert.alert('Atenção', 'Por favor, selecione uma turma');
      return;
    }

    try {
      setIsSaving(true);

      const dataProvaStr = dataProva.toISOString().split('T')[0];

      if (isEditing && params.testId) {
        await testsService.updateTest(params.testId, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_prova: dataProvaStr,
          horario: horario.trim() || undefined,
          sala: sala.trim() || undefined,
          duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos) : undefined,
        });
        Alert.alert('Sucesso', 'Prova atualizada com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await testsService.createTest({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_prova: dataProvaStr,
          horario: horario.trim() || undefined,
          sala: sala.trim() || undefined,
          duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos) : undefined,
        });
        Alert.alert('Sucesso', 'Prova criada com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar prova');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Prova' : 'Nova Prova'}
          </Text>
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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Prova' : 'Nova Prova'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o título da prova"
            placeholderTextColor={Colors.textMuted}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite a descrição da prova (opcional)"
            placeholderTextColor={Colors.textMuted}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Disciplina *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowDisciplinaSelector(true)}
          >
            <Text style={styles.selectorButtonText}>
              {selectedDisciplina ? selectedDisciplina.nome : 'Selecione uma disciplina'}
            </Text>
            <Text style={styles.selectorButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Turma *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowTurmaSelector(true)}
          >
            <Text style={styles.selectorButtonText}>
              {selectedTurma ? `${selectedTurma.serie} ${selectedTurma.turma_letra}` : 'Selecione uma turma'}
            </Text>
            <Text style={styles.selectorButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Data da Prova *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.selectorButtonText}>{formatDate(dataProva)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Horário</Text>
          <View style={styles.inputWithIcon}>
            <Clock size={20} color={Colors.textMuted} />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Ex: 14:00"
              placeholderTextColor={Colors.textMuted}
              value={horario}
              onChangeText={setHorario}
              keyboardType="default"
            />
          </View>
          <Text style={styles.helperText}>Formato: HH:MM (ex: 14:30)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Sala</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={20} color={Colors.textMuted} />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Ex: Sala 101"
              placeholderTextColor={Colors.textMuted}
              value={sala}
              onChangeText={setSala}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Duração (minutos)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 90"
            placeholderTextColor={Colors.textMuted}
            value={duracaoMinutos}
            onChangeText={(text) => {
              // Permite apenas números
              const numericValue = text.replace(/[^0-9]/g, '');
              setDuracaoMinutos(numericValue);
            }}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Save size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Salvar Alterações' : 'Criar Prova'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Data</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerModalContent}>
              <Text style={styles.helperText}>Digite a data no formato DD/MM/AAAA:</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={Colors.textMuted}
                value={formatDate(dataProva)}
                onChangeText={(text) => {
                  // Parse manual da data DD/MM/AAAA
                  const parts = text.split('/');
                  if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const year = parseInt(parts[2], 10);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      setDataProva(new Date(year, month, day));
                    }
                  }
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.saveButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de seleção de disciplina */}
      {showDisciplinaSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Disciplina</Text>
              <TouchableOpacity onPress={() => setShowDisciplinaSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {disciplinas.map((disciplina) => (
                <TouchableOpacity
                  key={disciplina.id}
                  style={[
                    styles.modalOption,
                    selectedDisciplina?.id === disciplina.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDisciplina(disciplina);
                    setShowDisciplinaSelector(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{disciplina.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 8,
  },
  datePickerModalContent: {
    padding: 20,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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

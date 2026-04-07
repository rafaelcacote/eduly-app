import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { exercisesService, Exercise } from '@/services/exercises';
import { teachersService, Disciplina, Turma } from '@/services/teachers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Save } from 'lucide-react-native';
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

export default function CreateExercise() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const { user } = useAuth();
  const isEditing = !!params.exerciseId;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [tipoExercicio, setTipoExercicio] = useState<string>('');
  const [dataEntrega, setDataEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisciplinaSelector, setShowDisciplinaSelector] = useState(false);
  const [showTurmaSelector, setShowTurmaSelector] = useState(false);
  const [showTipoExercicioSelector, setShowTipoExercicioSelector] = useState(false);

  const tiposExercicio = [
    'Exercício de caderno',
    'Exercício de livro',
    'Trabalho',
  ];

  useEffect(() => {
    loadData();
    if (isEditing && params.exerciseId) {
      loadExercise(params.exerciseId);
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

  const loadExercise = async (id: string) => {
    try {
      setIsLoading(true);
      const exercise = await exercisesService.getExerciseById(id);
      setTitulo(exercise.titulo);
      setDescricao(exercise.descricao);
      setDataEntrega(new Date(exercise.data_entrega));
      if (exercise.tipo_exercicio) {
        setTipoExercicio(exercise.tipo_exercicio);
      }
      
      // Encontra disciplina e turma correspondentes
      if (exercise.disciplina_id) {
        const disciplina = disciplinas.find(d => d.id === exercise.disciplina_id);
        if (disciplina) setSelectedDisciplina(disciplina);
      }
      if (exercise.turma_id) {
        const turma = turmas.find(t => t.id === exercise.turma_id);
        if (turma) setSelectedTurma(turma);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar exercício');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o título do exercício');
      return;
    }

    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha a descrição do exercício');
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

    if (!tipoExercicio) {
      Alert.alert('Atenção', 'Por favor, selecione o tipo de exercício');
      return;
    }

    try {
      setIsSaving(true);

      const dataEntregaStr = dataEntrega.toISOString().split('T')[0];

      if (isEditing && params.exerciseId) {
        await exercisesService.updateExercise(params.exerciseId, {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_entrega: dataEntregaStr,
          tipo_exercicio: tipoExercicio,
        });
        Alert.alert('Sucesso', 'Exercício atualizado com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await exercisesService.createExercise({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_entrega: dataEntregaStr,
          tipo_exercicio: tipoExercicio,
        });
        Alert.alert('Sucesso', 'Exercício criado com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar exercício');
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
            {isEditing ? 'Editar Exercício' : 'Novo Exercício'}
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
          {isEditing ? 'Editar Exercício' : 'Novo Exercício'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o título do exercício"
            placeholderTextColor={Colors.textMuted}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Descrição *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite a descrição do exercício"
            placeholderTextColor={Colors.textMuted}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={8}
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
          <Text style={styles.label}>Tipo de Exercício *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowTipoExercicioSelector(true)}
          >
            <Text style={styles.selectorButtonText}>
              {tipoExercicio || 'Selecione o tipo de exercício'}
            </Text>
            <Text style={styles.selectorButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Data de Entrega *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.selectorButtonText}>{formatDate(dataEntrega)}</Text>
          </TouchableOpacity>
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
                {isEditing ? 'Salvar Alterações' : 'Criar Exercício'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS === 'android' && (
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
                value={formatDate(dataEntrega)}
                onChangeText={(text) => {
                  // Parse manual da data DD/MM/AAAA
                  const parts = text.split('/');
                  if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const year = parseInt(parts[2], 10);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      const newDate = new Date(year, month, day);
                      if (newDate >= new Date()) {
                        setDataEntrega(newDate);
                      }
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

      {/* Modal de seleção de tipo de exercício */}
      {showTipoExercicioSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o Tipo de Exercício</Text>
              <TouchableOpacity onPress={() => setShowTipoExercicioSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {tiposExercicio.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.modalOption,
                    tipoExercicio === tipo && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setTipoExercicio(tipo);
                    setShowTipoExercicioSelector(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{tipo}</Text>
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
  datePickerContainer: {
    marginTop: 8,
  },
  datePickerModalContent: {
    padding: 20,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 160,
    paddingTop: 14,
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

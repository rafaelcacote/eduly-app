import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import Calendar from '@/components/Calendar';
import { SuccessModal } from '@/components/SuccessModal';
import { Colors } from '@/constants/colors';
import { exercisesService } from '@/services/exercises';
import { teachersService, Disciplina, Turma } from '@/services/teachers';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, Save } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** YYYY-MM-DD no fuso local (evita toISOString deslocar o dia) */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseLocalISODate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map((part) => Number.parseInt(part, 10));
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
}

function showAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

export default function CreateExercise() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const isEditing = !!params.exerciseId;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [tipoExercicio, setTipoExercicio] = useState<string>('');
  const [dataEntrega, setDataEntrega] = useState(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => new Date());
  const [dateDraft, setDateDraft] = useState('');
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisciplinaSelector, setShowDisciplinaSelector] = useState(false);
  const [showTurmaSelector, setShowTurmaSelector] = useState(false);
  const [showTipoExercicioSelector, setShowTipoExercicioSelector] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Tudo certo!');
  const [successMessage, setSuccessMessage] = useState('');

  /** Valores aceitos pela API (Rule::in no backend) */
  const tiposExercicio = [
    { value: 'exercicio_caderno', label: 'Exercício de caderno' },
    { value: 'exercicio_livro', label: 'Exercício de livro' },
    { value: 'trabalho', label: 'Trabalho' },
  ] as const;

  const tipoExercicioLabel =
    tiposExercicio.find((t) => t.value === tipoExercicio)?.label || tipoExercicio;

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
      showAlert('Erro', error.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExercise = async (id: string) => {
    try {
      setIsLoading(true);
      const exercise = await exercisesService.getExerciseById(id);
      setTitulo(exercise.titulo);
      setDescricao(exercise.descricao || '');
      const entrega = parseLocalISODate(exercise.data_entrega);
      setDataEntrega(entrega);
      setPickerMonth(entrega);
      if (exercise.tipo_exercicio) {
        setTipoExercicio(exercise.tipo_exercicio);
      }

      const [disciplinasData, turmasData] = await Promise.all([
        teachersService.getDisciplinas(),
        teachersService.getTurmas(),
      ]);
      setDisciplinas(disciplinasData);
      setTurmas(turmasData);

      if (exercise.disciplina_id) {
        const disciplina = disciplinasData.find((d) => d.id === exercise.disciplina_id);
        if (disciplina) setSelectedDisciplina(disciplina);
      }
      if (exercise.turma_id) {
        const turma = turmasData.find((t) => t.id === exercise.turma_id);
        if (turma) setSelectedTurma(turma);
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao carregar exercício', () => router.back());
    } finally {
      setIsLoading(false);
    }
  };

  const openDatePicker = () => {
    setPickerMonth(new Date(dataEntrega.getFullYear(), dataEntrega.getMonth(), 1));
    setDateDraft(formatDateDisplay(dataEntrega));
    setShowDatePicker(true);
  };

  const applyDateMask = (text: string): string => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const parseDraftDate = (text: string): Date | null => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const date = new Date(year, month, day, 12, 0, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const confirmDraftDate = () => {
    const parsed = parseDraftDate(dateDraft);
    if (!parsed) {
      showAlert('Atenção', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    if (parsed < startOfToday()) {
      showAlert('Atenção', 'A data de entrega deve ser hoje ou uma data futura.');
      return;
    }
    setDataEntrega(parsed);
    setShowDatePicker(false);
  };

  const handleDayPress = (day: number) => {
    const next = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day, 12, 0, 0);
    if (next < startOfToday()) {
      showAlert('Atenção', 'A data de entrega deve ser hoje ou uma data futura.');
      return;
    }
    setDataEntrega(next);
    setDateDraft(formatDateDisplay(next));
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      showAlert('Atenção', 'Por favor, preencha o título do exercício');
      return;
    }

    if (!descricao.trim()) {
      showAlert('Atenção', 'Por favor, preencha a descrição do exercício');
      return;
    }

    if (!selectedDisciplina) {
      showAlert('Atenção', 'Por favor, selecione uma disciplina');
      return;
    }

    if (!selectedTurma) {
      showAlert('Atenção', 'Por favor, selecione uma turma');
      return;
    }

    if (!tipoExercicio) {
      showAlert('Atenção', 'Por favor, selecione o tipo de exercício');
      return;
    }

    if (dataEntrega < startOfToday()) {
      showAlert('Atenção', 'A data de entrega deve ser hoje ou uma data futura.');
      return;
    }

    try {
      setIsSaving(true);

      const dataEntregaStr = toLocalISODate(dataEntrega);

      if (isEditing && params.exerciseId) {
        await exercisesService.updateExercise(params.exerciseId, {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_entrega: dataEntregaStr,
          tipo_exercicio: tipoExercicio,
        });
        setSuccessTitle('Exercício atualizado');
        setSuccessMessage('As alterações foram salvas e já estão disponíveis para os alunos.');
        setSuccessVisible(true);
      } else {
        await exercisesService.createExercise({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina_id: selectedDisciplina.id,
          turma_id: selectedTurma.id,
          data_entrega: dataEntregaStr,
          tipo_exercicio: tipoExercicio,
        });
        setSuccessTitle('Exercício criado');
        setSuccessMessage('O exercício foi publicado com sucesso e já pode ser visto pelos alunos.');
        setSuccessVisible(true);
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao salvar exercício');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    router.replace('/exercises');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title={isEditing ? 'Editar Exercício' : 'Novo Exercício'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  const selectedDayInPicker =
    pickerMonth.getMonth() === dataEntrega.getMonth() &&
    pickerMonth.getFullYear() === dataEntrega.getFullYear()
      ? dataEntrega.getDate()
      : null;

  return (
    <View style={styles.container}>
      <AppHeader title={isEditing ? 'Editar Exercício' : 'Novo Exercício'} />

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
              {selectedTurma
                ? `${selectedTurma.serie} ${selectedTurma.turma_letra}`
                : 'Selecione uma turma'}
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
              {tipoExercicioLabel || 'Selecione o tipo de exercício'}
            </Text>
            <Text style={styles.selectorButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Data de Entrega *</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.webDateRow}>
              {/* input nativo no web — mais confiável que Alert/modal de texto */}
              <input
                type="date"
                value={toLocalISODate(dataEntrega)}
                min={toLocalISODate(startOfToday())}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  const next = parseLocalISODate(value);
                  if (next < startOfToday()) {
                    showAlert('Atenção', 'A data de entrega deve ser hoje ou uma data futura.');
                    return;
                  }
                  setDataEntrega(next);
                }}
                style={{
                  flex: 1,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  fontSize: 16,
                  color: Colors.text,
                  backgroundColor: Colors.white,
                  fontFamily: 'inherit',
                }}
              />
              <TouchableOpacity style={styles.webDateButton} onPress={openDatePicker}>
                <CalendarIcon size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectorButton} onPress={openDatePicker}>
              <CalendarIcon size={20} color={Colors.primary} />
              <Text style={styles.selectorButtonText}>{formatDateDisplay(dataEntrega)}</Text>
            </TouchableOpacity>
          )}
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

      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        hint="Você será redirecionado para a lista de exercícios."
        buttonLabel="Ver exercícios"
        onClose={handleSuccessClose}
      />

      {/* Date Picker Modal — disponível em todas as plataformas */}
      {showDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Data</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.datePickerModalContent}>
              <Calendar
                selectedDate={pickerMonth}
                onDateChange={setPickerMonth}
                selectedDay={selectedDayInPicker}
                onDayPress={handleDayPress}
              />
              <Text style={[styles.helperText, { marginTop: 16 }]}>
                Ou digite a data no formato DD/MM/AAAA:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={Colors.textMuted}
                value={dateDraft}
                onChangeText={(text) => setDateDraft(applyDateMask(text))}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity style={styles.saveButton} onPress={confirmDraftDate}>
                <Text style={styles.saveButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

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
                  <Text style={styles.modalOptionText}>
                    {turma.serie} {turma.turma_letra}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

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
                  key={tipo.value}
                  style={[
                    styles.modalOption,
                    tipoExercicio === tipo.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setTipoExercicio(tipo.value);
                    setShowTipoExercicioSelector(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{tipo.label}</Text>
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
  webDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webDateButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '80%',
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
  datePickerModalContent: {
    padding: 16,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
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

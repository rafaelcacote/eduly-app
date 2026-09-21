import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AUTHOR_FALLBACK_NAME,
  getAuthorFirstName,
  type MessageAuthor,
} from './authors';
import { apiClient } from './api';

const EXERCISES_SEEN_IDS_KEY = '@eduly:exercises_seen_ids';
const NEW_EXERCISE_HOURS = 72;

/** Professor aninhado (API pode variar o formato) */
export interface ExerciseProfessor {
  id?: string;
  nome_completo?: string;
  foto_url?: string | null;
  avatar_url?: string | null;
  usuario?: {
    id?: string;
    nome_completo?: string;
    foto_url?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface Exercise {
  id: string;
  titulo: string;
  descricao: string;
  disciplina_id: string;
  disciplina_nome?: string;
  disciplina?: { id?: string; nome?: string; sigla?: string } | null;
  turma_id: string;
  turma_nome?: string;
  turma?: {
    id?: string;
    nome?: string;
    serie?: string;
    turma_letra?: string;
    ano_letivo?: number;
  } | null;
  professor_id: string;
  professor_nome?: string;
  professor_foto_url?: string | null;
  professor_avatar_url?: string | null;
  professor?: ExerciseProfessor | null;
  data_entrega: string;
  anexo_url: string | null;
  tipo_exercicio?: string;
  created_at: string;
  updated_at: string;
}

/** Normaliza o professor do exercício para o mesmo shape de autor dos recados */
export function getExerciseProfessorAuthor(exercise: Exercise): MessageAuthor | null {
  const nested = exercise.professor;
  const user = nested?.usuario;
  const nome =
    nested?.nome_completo?.trim() ||
    user?.nome_completo?.trim() ||
    exercise.professor_nome?.trim() ||
    '';

  const id = nested?.id || user?.id || exercise.professor_id || '';
  if (!nome && !id) return null;

  return {
    id: id || 'professor',
    nome_completo: nome || AUTHOR_FALLBACK_NAME,
    foto_url:
      nested?.foto_url ||
      user?.foto_url ||
      exercise.professor_foto_url ||
      null,
    avatar_url:
      nested?.avatar_url ||
      user?.avatar_url ||
      exercise.professor_avatar_url ||
      null,
  };
}

export function getExerciseDisciplineName(exercise: Exercise): string {
  return (
    exercise.disciplina_nome?.trim() ||
    exercise.disciplina?.nome?.trim() ||
    'Disciplina'
  );
}

export function getExerciseProfessorFirstName(exercise: Exercise): string {
  const author = getExerciseProfessorAuthor(exercise);
  return getAuthorFirstName(author?.nome_completo);
}

export function getExerciseTypeLabel(exercise: Exercise): string {
  const type = (exercise.tipo_exercicio || (exercise as { tipo?: string }).tipo || '')
    .toLowerCase()
    .trim();

  if (!type) return 'Exercício';
  if (type === 'exercicio_caderno' || type.includes('caderno')) return 'Exercício de caderno';
  if (type === 'exercicio_livro' || type.includes('livro')) return 'Exercício de livro';
  if (type === 'trabalho' || type.includes('trabalho')) return 'Trabalho';
  if (type.includes('lição') || type.includes('licao') || type.includes('casa')) {
    return 'Lição de casa';
  }
  return exercise.tipo_exercicio || 'Exercício';
}

function formatTurmaNome(turma?: Exercise['turma'] | null): string | undefined {
  if (!turma) return undefined;
  if (turma.serie && turma.turma_letra) {
    return `${turma.serie} ${turma.turma_letra}`;
  }
  return turma.nome || undefined;
}

/** Normaliza item da API (campos aninhados → flat usados na UI) */
export function normalizeExercise(raw: unknown): Exercise {
  const item = (raw || {}) as Exercise & Record<string, any>;
  const professor = item.professor ?? null;
  const usuario = professor?.usuario;

  return {
    ...item,
    id: String(item.id),
    titulo: item.titulo || '',
    descricao: item.descricao || '',
    disciplina_id: item.disciplina_id || item.disciplina?.id || '',
    disciplina_nome: item.disciplina_nome || item.disciplina?.nome,
    disciplina: item.disciplina ?? null,
    turma_id: item.turma_id || item.turma?.id || '',
    turma_nome: item.turma_nome || formatTurmaNome(item.turma),
    professor_id: item.professor_id || professor?.id || '',
    professor_nome:
      item.professor_nome ||
      professor?.nome_completo ||
      usuario?.nome_completo,
    professor_foto_url:
      item.professor_foto_url || professor?.foto_url || usuario?.foto_url || null,
    professor_avatar_url:
      item.professor_avatar_url || professor?.avatar_url || usuario?.avatar_url || null,
    professor,
    data_entrega: item.data_entrega,
    anexo_url: item.anexo_url || null,
    tipo_exercicio: item.tipo_exercicio,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function unwrapExerciseList(payload: unknown): Exercise[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeExercise(item));
  }
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return ((payload as { data: unknown[] }).data).map((item) =>
      normalizeExercise(item)
    );
  }
  return [];
}

export interface ExercisesResponse {
  exercises: Exercise[];
}

export interface ExerciseResponse {
  exercise: Exercise;
}

export interface CreateExerciseRequest {
  titulo: string;
  descricao: string;
  disciplina_id: string;
  turma_id: string;
  data_entrega: string;
  anexo_url?: string;
  tipo_exercicio?: string;
}

export interface UpdateExerciseRequest {
  titulo?: string;
  descricao?: string;
  disciplina_id?: string;
  turma_id?: string;
  data_entrega?: string;
  anexo_url?: string;
  tipo_exercicio?: string;
}

export interface ExercisesListParams {
  turma_id?: string;
  disciplina_id?: string;
  aluno_id?: string;
}

/**
 * Serviço para gerenciar exercícios
 */
class ExercisesService {
  /**
   * Lista todos os exercícios com filtros opcionais
   */
  async getExercises(params?: ExercisesListParams): Promise<Exercise[]> {
    try {
      let endpoint = '/api/mobile/exercises';
      const queryParams: string[] = [];

      if (params?.turma_id) {
        queryParams.push(`turma_id=${params.turma_id}`);
      }
      if (params?.disciplina_id) {
        queryParams.push(`disciplina_id=${params.disciplina_id}`);
      }
      if (params?.aluno_id) {
        queryParams.push(`aluno_id=${params.aluno_id}`);
      }

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }

      const response = await apiClient.get<ExercisesResponse | { data: Exercise[] }>(endpoint);

      // Suporta diferentes formatos de resposta da API
      if (response && typeof response === 'object' && 'exercises' in response) {
        return unwrapExerciseList((response as ExercisesResponse).exercises);
      }
      if (response && typeof response === 'object' && 'data' in response) {
        return unwrapExerciseList((response as { data: unknown }).data);
      }
      return unwrapExerciseList(response);
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar exercícios. Tente novamente.');
    }
  }

  /**
   * Busca detalhes de um exercício específico
   */
  async getExerciseById(id: string): Promise<Exercise> {
    try {
      const response = await apiClient.get<ExerciseResponse | { data: Exercise }>(`/api/mobile/exercises/${id}`);
      
      // Suporta diferentes formatos de resposta
      if ('exercise' in response) {
        return normalizeExercise(response.exercise);
      }
      if ('data' in response) {
        return normalizeExercise(response.data);
      }
      throw new Error('Formato de resposta inválido');
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar exercício. Tente novamente.');
    }
  }

  /**
   * Cria um novo exercício (apenas professores)
   */
  async createExercise(data: CreateExerciseRequest): Promise<Exercise> {
    try {
      const response = await apiClient.post<
        ExerciseResponse | { data: Exercise } | { exercise: { data: Exercise } | Exercise }
      >('/api/mobile/exercises', {
        titulo: data.titulo,
        descricao: data.descricao,
        disciplina_id: data.disciplina_id,
        turma_id: data.turma_id,
        data_entrega: data.data_entrega,
        anexo_url: data.anexo_url || null,
        tipo_exercicio: data.tipo_exercicio || null,
      });

      if (response && typeof response === 'object') {
        if ('exercise' in response) {
          const exercisePayload = (response as any).exercise;
          return normalizeExercise(exercisePayload?.data ?? exercisePayload);
        }
        if ('data' in response) {
          return normalizeExercise((response as { data: Exercise }).data);
        }
      }
      throw new Error('Formato de resposta inválido');
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao criar exercício. Tente novamente.');
    }
  }

  /**
   * Atualiza um exercício (apenas professores)
   */
  async updateExercise(id: string, data: UpdateExerciseRequest): Promise<Exercise> {
    try {
      const response = await apiClient.put<ExerciseResponse | { data: Exercise }>(`/api/mobile/exercises/${id}`, {
        titulo: data.titulo,
        descricao: data.descricao,
        disciplina_id: data.disciplina_id,
        turma_id: data.turma_id,
        data_entrega: data.data_entrega,
        anexo_url: data.anexo_url,
        tipo_exercicio: data.tipo_exercicio,
      });

      // Suporta diferentes formatos de resposta
      if ('exercise' in response) {
        return normalizeExercise(response.exercise);
      }
      if ('data' in response) {
        return normalizeExercise(response.data);
      }
      throw new Error('Formato de resposta inválido');
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao atualizar exercício. Tente novamente.');
    }
  }

  /**
   * Deleta um exercício (apenas professores)
   */
  async deleteExercise(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/mobile/exercises/${id}`);
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao deletar exercício. Tente novamente.');
    }
  }

  /**
   * IDs de exercícios já vistos pelo responsável (indicador "novo")
   */
  async getSeenExerciseIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(EXERCISES_SEEN_IDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * Marca exercícios como vistos
   */
  async markExercisesSeen(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const current = await this.getSeenExerciseIds();
      const merged = Array.from(new Set([...current, ...ids]));
      // Mantém lista enxuta
      const trimmed = merged.slice(-300);
      await AsyncStorage.setItem(EXERCISES_SEEN_IDS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Erro ao marcar exercícios como vistos:', error);
    }
  }

  /**
   * Exercício é "novo" se nunca foi visto (ou criado nas últimas 72h na 1ª visita)
   */
  isExerciseNew(exercise: Exercise, seenIds: string[]): boolean {
    if (seenIds.includes(exercise.id)) return false;
    // Se a lista de vistos ainda está vazia (primeira instalação),
    // só destaca exercícios recentes para não marcar tudo como novo.
    if (seenIds.length === 0) {
      const created = new Date(exercise.created_at).getTime();
      if (Number.isNaN(created)) return true;
      const hours = (Date.now() - created) / (1000 * 60 * 60);
      return hours <= NEW_EXERCISE_HOURS;
    }
    return true;
  }

  async countNewExercises(alunoId?: string): Promise<number> {
    try {
      const [exercises, seenIds] = await Promise.all([
        this.getExercises(alunoId ? { aluno_id: alunoId } : undefined),
        this.getSeenExerciseIds(),
      ]);
      return exercises.filter((item) => this.isExerciseNew(item, seenIds)).length;
    } catch {
      return 0;
    }
  }
}

export const exercisesService = new ExercisesService();

import { apiClient } from './api';

export interface Exercise {
  id: string;
  titulo: string;
  descricao: string;
  disciplina_id: string;
  disciplina_nome?: string;
  turma_id: string;
  turma_nome?: string;
  professor_id: string;
  professor_nome?: string;
  data_entrega: string;
  anexo_url: string | null;
  tipo_exercicio?: string;
  created_at: string;
  updated_at: string;
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
      
      // Suporta diferentes formatos de resposta
      if ('exercises' in response) {
        return response.exercises || [];
      }
      if ('data' in response) {
        return response.data || [];
      }
      return [];
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
        return response.exercise;
      }
      if ('data' in response) {
        return response.data;
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
      const response = await apiClient.post<ExerciseResponse | { data: Exercise }>('/api/mobile/exercises', {
        titulo: data.titulo,
        descricao: data.descricao,
        disciplina_id: data.disciplina_id,
        turma_id: data.turma_id,
        data_entrega: data.data_entrega,
        anexo_url: data.anexo_url || null,
        tipo_exercicio: data.tipo_exercicio || null,
      });

      // Suporta diferentes formatos de resposta
      if ('exercise' in response) {
        return response.exercise;
      }
      if ('data' in response) {
        return response.data;
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
        return response.exercise;
      }
      if ('data' in response) {
        return response.data;
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
}

export const exercisesService = new ExercisesService();

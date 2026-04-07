import { apiClient } from './api';

export interface Disciplina {
  id: string;
  nome: string;
  sigla: string;
}

export interface Turma {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  ano_letivo: number;
}

export interface Usuario {
  id: string;
  nome_completo: string;
}

export interface Professor {
  id: string;
  usuario: Usuario;
}

export interface Test {
  id: string;
  titulo: string;
  descricao: string | null;
  data_prova: string;
  data_prova_formatted: string;
  horario: string | null;
  sala: string | null;
  duracao_minutos: number | null;
  disciplina: Disciplina;
  turma: Turma;
  professor: Professor;
  created_at: string;
  updated_at: string;
}

export interface TestsResponse {
  tests: Test[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface TestResponse {
  test: Test;
}

export interface CreateTestRequest {
  disciplina_id: string;
  titulo: string;
  descricao?: string;
  data_prova: string;
  horario?: string;
  sala?: string;
  duracao_minutos?: number;
  turma_id: string;
}

export interface UpdateTestRequest {
  titulo?: string;
  descricao?: string;
  data_prova?: string;
  horario?: string;
  sala?: string;
  duracao_minutos?: number;
  disciplina_id?: string;
  turma_id?: string;
}

export interface TestsListParams {
  turma_id?: string;
  disciplina_id?: string;
  aluno_id?: string;
}

/**
 * Serviço para gerenciar provas
 */
class TestsService {
  /**
   * Lista todas as provas com filtros opcionais
   */
  async getTests(params?: TestsListParams): Promise<Test[]> {
    try {
      let endpoint = '/api/mobile/tests';
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

      const response = await apiClient.get<TestsResponse>(endpoint);
      return response.tests || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar provas. Tente novamente.');
    }
  }

  /**
   * Busca detalhes de uma prova específica
   */
  async getTestById(id: string): Promise<Test> {
    try {
      const response = await apiClient.get<TestResponse>(`/api/mobile/tests/${id}`);
      return response.test;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar prova. Tente novamente.');
    }
  }

  /**
   * Cria uma nova prova (apenas professores)
   */
  async createTest(data: CreateTestRequest): Promise<Test> {
    try {
      const response = await apiClient.post<{ message: string; test: Test }>('/api/mobile/tests', {
        disciplina_id: data.disciplina_id,
        titulo: data.titulo,
        descricao: data.descricao || null,
        data_prova: data.data_prova,
        horario: data.horario || null,
        sala: data.sala || null,
        duracao_minutos: data.duracao_minutos || null,
        turma_id: data.turma_id,
      });

      return response.test;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao criar prova. Tente novamente.');
    }
  }

  /**
   * Atualiza uma prova (apenas professores)
   */
  async updateTest(id: string, data: UpdateTestRequest): Promise<Test> {
    try {
      const response = await apiClient.put<{ message: string; test: Test }>(`/api/mobile/tests/${id}`, {
        titulo: data.titulo,
        descricao: data.descricao,
        data_prova: data.data_prova,
        horario: data.horario,
        sala: data.sala,
        duracao_minutos: data.duracao_minutos,
        disciplina_id: data.disciplina_id,
        turma_id: data.turma_id,
      });

      return response.test;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao atualizar prova. Tente novamente.');
    }
  }

  /**
   * Deleta uma prova (apenas professores)
   */
  async deleteTest(id: string): Promise<void> {
    try {
      await apiClient.delete<{ message: string }>(`/api/mobile/tests/${id}`);
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao deletar prova. Tente novamente.');
    }
  }
}

export const testsService = new TestsService();

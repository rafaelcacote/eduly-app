import { apiClient } from './api';

export interface Disciplina {
  id: string;
  nome: string;
  sigla: string;
}

export interface School {
  id: string;
  nome: string;
  logo_url?: string | null;
}

export interface Turma {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  ano_letivo: number;
  school?: School;
  escola?: { id: string; nome: string };
}

export interface Aluno {
  id: string;
  nome: string;
  nome_social: string | null;
  foto_url: string | null;
  turma_id: string;
  turma_nome?: string;
}

export interface DisciplinasResponse {
  disciplinas: Disciplina[];
}

export interface TurmasResponse {
  turmas: Turma[];
}

export interface AlunosResponse {
  alunos: Aluno[];
}

/**
 * Serviço para gerenciar dados de professores
 */
class TeachersService {
  /**
   * Lista todas as disciplinas do professor autenticado
   */
  async getDisciplinas(): Promise<Disciplina[]> {
    try {
      const response = await apiClient.get<DisciplinasResponse>('/api/mobile/teacher/disciplinas');
      return response.disciplinas || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar disciplinas. Tente novamente.');
    }
  }

  /**
   * Lista todas as turmas do professor autenticado
   */
  async getTurmas(): Promise<Turma[]> {
    try {
      const response = await apiClient.get<TurmasResponse>('/api/mobile/teacher/turmas');
      return response.turmas || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar turmas. Tente novamente.');
    }
  }

  /**
   * Lista todos os alunos de uma turma específica
   */
  async getAlunosByTurma(turmaId: string): Promise<Aluno[]> {
    try {
      const response = await apiClient.get<AlunosResponse>(`/api/mobile/teacher/turmas/${turmaId}/alunos`);
      return response.alunos || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar alunos. Tente novamente.');
    }
  }

  /**
   * Lista todos os alunos de todas as turmas do professor
   */
  async getAllAlunos(): Promise<Aluno[]> {
    try {
      const response = await apiClient.get<AlunosResponse>('/api/mobile/teacher/alunos');
      return response.alunos || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar alunos. Tente novamente.');
    }
  }
}

export const teachersService = new TeachersService();

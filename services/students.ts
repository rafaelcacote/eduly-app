import { apiClient } from './api';

export interface Turma {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  ano_letivo: number;
  data_matricula: string;
}

export interface School {
  id: string;
  nome: string;
  logo_url: string | null;
}

export interface Student {
  id: string;
  nome: string;
  nome_social: string | null;
  foto_url: string | null;
  data_nascimento: string;
  is_principal: boolean;
  school: School;
  turmas: Turma[];
  informacoes_medicas?: string | null;
}

export interface StudentsResponse {
  students: Student[];
}

export interface StudentResponse {
  student: Student;
}

/**
 * Serviço para gerenciar alunos
 */
class StudentsService {
  /**
   * Lista todos os alunos do responsável autenticado
   */
  async getStudents(): Promise<Student[]> {
    try {
      const response = await apiClient.get<StudentsResponse>('/api/mobile/students');
      return response.students || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar alunos. Tente novamente.');
    }
  }

  /**
   * Busca detalhes de um aluno específico
   */
  async getStudentById(id: string): Promise<Student> {
    try {
      const response = await apiClient.get<StudentResponse>(`/api/mobile/students/${id}`);
      return response.student;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar aluno. Tente novamente.');
    }
  }
}

export const studentsService = new StudentsService();

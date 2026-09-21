import { apiClient } from './api';

export interface BoletimAluno {
  id: string;
  nome: string;
}

export interface BoletimTurma {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  ano_letivo: number;
}

export type BimestresMap = {
  '1': number | null;
  '2': number | null;
  '3': number | null;
  '4': number | null;
};

export interface BoletimDisciplina {
  id: string;
  nome: string;
  sigla: string;
  bimestres: BimestresMap;
  media: number | null;
}

export interface Boletim {
  aluno: BoletimAluno;
  turma: BoletimTurma;
  disciplinas: BoletimDisciplina[];
  media_geral: number | null;
}

export interface BoletimResponse {
  boletim: Boletim;
}

/**
 * Serviço para consultar o boletim do aluno
 */
class BoletimService {
  async getBoletim(alunoId: string, turmaId: string): Promise<Boletim> {
    try {
      const endpoint = `/api/mobile/students/${alunoId}/boletim?turma_id=${turmaId}`;
      const response = await apiClient.get<BoletimResponse>(endpoint);
      return response.boletim;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Não foi possível carregar o boletim.');
    }
  }
}

export const boletimService = new BoletimService();

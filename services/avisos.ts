import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

const AVISOS_LAST_SEEN_KEY = '@eduly:avisos_last_seen';
const NEW_AVISO_HOURS = 24; // se nunca viu, considera "novo" avisos das últimas 24h

export type AvisoPrioridade = 'baixa' | 'normal' | 'alta';
export type AvisoPublicoAlvo = 'todos' | string;

export interface AvisoTenant {
  id: string;
  nome: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  prioridade: AvisoPrioridade;
  publico_alvo: AvisoPublicoAlvo;
  anexo_url: string | null;
  publicado: boolean;
  publicado_em: string;
  expira_em: string | null;
  created_at: string;
  updated_at: string;
  tenant: AvisoTenant;
}

export interface AvisosListResponse {
  avisos: Aviso[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AvisoDetailResponse {
  aviso: Aviso;
}

export interface AvisosListParams {
  page?: number;
}

/**
 * Serviço para gerenciar avisos da escola (para todos os alunos/responsáveis)
 */
class AvisosService {
  /**
   * Lista avisos com paginação
   */
  async getAvisos(params?: AvisosListParams): Promise<AvisosListResponse> {
    try {
      let endpoint = '/api/mobile/avisos';
      const queryParams: string[] = [];

      if (params?.page !== undefined && params.page > 1) {
        queryParams.push(`page=${params.page}`);
      }

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }

      const response = await apiClient.get<AvisosListResponse>(endpoint);
      return response;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar avisos. Tente novamente.');
    }
  }

  /**
   * Busca detalhes de um aviso específico
   */
  async getAvisoById(id: string): Promise<Aviso> {
    try {
      const response = await apiClient.get<AvisoDetailResponse>(`/api/mobile/avisos/${id}`);
      return response.aviso;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar aviso. Tente novamente.');
    }
  }

  /**
   * Data/hora da última vez que o usuário viu a lista de avisos (para indicador "novo")
   */
  async getLastSeenAvisosAt(): Promise<string | null> {
    return AsyncStorage.getItem(AVISOS_LAST_SEEN_KEY);
  }

  /**
   * Marca que o usuário viu os avisos agora (chamar ao abrir a tela de mensagens/avisos)
   */
  async setLastSeenAvisosAt(): Promise<void> {
    await AsyncStorage.setItem(AVISOS_LAST_SEEN_KEY, new Date().toISOString());
  }

  /**
   * Verifica se um aviso é "novo" (publicado após lastSeen, ou nas últimas 24h se lastSeen for null)
   */
  isAvisoNew(aviso: Aviso, lastSeenAt: string | null): boolean {
    const published = new Date(aviso.publicado_em || aviso.created_at).getTime();
    if (lastSeenAt) {
      return published > new Date(lastSeenAt).getTime();
    }
    const cutoff = Date.now() - NEW_AVISO_HOURS * 60 * 60 * 1000;
    return published > cutoff;
  }
}

export const avisosService = new AvisosService();

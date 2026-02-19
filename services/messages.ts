import { apiClient } from './api';

export type MessageType = 'informativo' | 'atencao' | 'aviso' | 'lembrete';
export type MessagePriority = 'normal' | 'alta' | 'media';

export interface Message {
  id: string;
  aluno_id: string;
  titulo: string;
  conteudo: string;
  tipo: MessageType;
  prioridade: MessagePriority;
  lida: boolean;
  anexo_url: string | null;
  created_at: string;
  updated_at: string;
  lida_em: string | null;
}

export interface MessagesResponse {
  messages: Message[];
}

export interface MessageResponse {
  message: Message;
}

export interface SendMessageRequest {
  aluno_id?: string;
  turma_id?: string;
  titulo: string;
  conteudo: string;
  tipo?: MessageType;
  prioridade?: MessagePriority;
  anexo_url?: string;
}

export interface SendMessageResponse {
  message: string;
  messages?: Message[];
  count?: number;
}

export interface MessagesListParams {
  aluno_id?: string;
  lida?: boolean;
}

/**
 * Serviço para gerenciar mensagens
 */
class MessagesService {
  /**
   * Lista todas as mensagens com filtros opcionais
   */
  async getMessages(params?: MessagesListParams): Promise<Message[]> {
    try {
      let endpoint = '/api/mobile/messages';
      const queryParams: string[] = [];

      if (params?.aluno_id) {
        queryParams.push(`aluno_id=${params.aluno_id}`);
      }
      if (params?.lida !== undefined) {
        queryParams.push(`lida=${params.lida}`);
      }

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }

      const response = await apiClient.get<MessagesResponse>(endpoint);
      return response.messages || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar mensagens. Tente novamente.');
    }
  }

  /**
   * Busca detalhes de uma mensagem específica
   */
  async getMessageById(id: string): Promise<Message> {
    try {
      const response = await apiClient.get<MessageResponse>(`/api/mobile/messages/${id}`);
      return response.message;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar mensagem. Tente novamente.');
    }
  }

  /**
   * Envia uma mensagem para um aluno específico
   */
  async sendMessageToStudent(data: SendMessageRequest & { aluno_id: string }): Promise<SendMessageResponse> {
    try {
      if (!data.aluno_id) {
        throw new Error('aluno_id é obrigatório para enviar mensagem a um aluno');
      }

      const response = await apiClient.post<SendMessageResponse>('/api/mobile/messages', {
        aluno_id: data.aluno_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'informativo',
        prioridade: data.prioridade || 'normal',
        anexo_url: data.anexo_url || null,
      });

      return response;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Envia uma mensagem para todos os alunos de uma turma
   */
  async sendMessageToClass(data: SendMessageRequest & { turma_id: string }): Promise<SendMessageResponse> {
    try {
      if (!data.turma_id) {
        throw new Error('turma_id é obrigatório para enviar mensagem a uma turma');
      }

      const response = await apiClient.post<SendMessageResponse>('/api/mobile/messages', {
        turma_id: data.turma_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'informativo',
        prioridade: data.prioridade || 'normal',
        anexo_url: data.anexo_url || null,
      });

      return response;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Marca uma mensagem como lida
   */
  async markAsRead(id: string): Promise<Message> {
    try {
      const response = await apiClient.patch<MessageResponse>(`/api/mobile/messages/${id}/read`);
      return response.message;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao marcar mensagem como lida. Tente novamente.');
    }
  }

  /**
   * Conta mensagens não lidas
   */
  async getUnreadCount(aluno_id?: string): Promise<number> {
    try {
      const messages = await this.getMessages({
        aluno_id,
        lida: false,
      });
      return messages.length;
    } catch (error: any) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }

  /**
   * Deleta uma mensagem (apenas professores)
   */
  async deleteMessage(id: string): Promise<void> {
    try {
      await apiClient.delete<{ message: string }>(`/api/mobile/messages/${id}`);
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao deletar mensagem. Tente novamente.');
    }
  }
}

export const messagesService = new MessagesService();

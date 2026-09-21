import { apiClient } from './api';
import type { MessageAuthor } from './authors';

export type MessageType = 'informativo' | 'atencao' | 'aviso' | 'lembrete' | 'outro';
export type MessagePriority = 'normal' | 'alta' | 'media';

export interface MessageAluno {
  id: string;
  nome: string;
  nome_social?: string | null;
}

export interface Message {
  id: string;
  aluno_id: string;
  conversa_id?: string | null;
  mensagem_pai_id?: string | null;
  titulo: string;
  conteudo: string;
  tipo: MessageType;
  prioridade: MessagePriority;
  lida: boolean;
  anexo_url: string | null;
  created_at: string;
  updated_at: string;
  lida_em: string | null;
  remetente?: MessageAuthor | null;
  destinatario?: MessageAuthor | null;
  aluno?: MessageAluno | null;
  unread_count?: number;
  messages_count?: number;
}

export interface Conversation {
  conversa_id: string;
  unread_count: number;
  messages_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  aluno?: MessageAluno | null;
  participantes?: MessageAuthor[];
  ultima_mensagem?: Message | null;
  /** Campos espelhados da última mensagem (compat listagem) */
  id?: string;
  aluno_id?: string;
  titulo?: string;
  conteudo?: string;
  tipo?: MessageType;
  prioridade?: MessagePriority;
  anexo_url?: string | null;
  lida?: boolean;
  lida_em?: string | null;
  remetente?: MessageAuthor | null;
  destinatario?: MessageAuthor | null;
}

export interface MessagesResponse {
  messages: Conversation[];
  conversas?: Conversation[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ConversationHistoryResponse {
  conversa_id: string;
  messages: Message[];
}

export interface MessageResponse {
  message: Message;
}

export interface SendMessageRequest {
  aluno_id?: string;
  turma_id?: string;
  professor_id?: string;
  conversa_id?: string;
  mensagem_pai_id?: string;
  titulo?: string;
  conteudo: string;
  tipo?: MessageType;
  prioridade?: MessagePriority;
  anexo_url?: string;
}

export interface SendMessageResponse {
  message: Message | string;
  messages?: Message[];
  count?: number;
}

export interface MessagesListParams {
  aluno_id?: string;
  lida?: boolean;
}

/**
 * Serviço para gerenciar mensagens / conversas
 */
class MessagesService {
  /**
   * Lista conversas (última mensagem de cada thread)
   */
  async getMessages(params?: MessagesListParams): Promise<Conversation[]> {
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
      return response.conversas || response.messages || [];
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao buscar mensagens. Tente novamente.');
    }
  }

  /**
   * Histórico ordenado de uma conversa
   */
  async getConversation(conversaId: string): Promise<ConversationHistoryResponse> {
    try {
      return await apiClient.get<ConversationHistoryResponse>(
        `/api/mobile/messages/conversas/${conversaId}`
      );
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao carregar conversa. Tente novamente.');
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
  async sendMessageToStudent(
    data: SendMessageRequest & { aluno_id: string; titulo: string }
  ): Promise<Message> {
    try {
      const response = await apiClient.post<MessageResponse>('/api/mobile/messages', {
        aluno_id: data.aluno_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'informativo',
        prioridade: data.prioridade || 'normal',
        anexo_url: data.anexo_url || null,
      });
      return response.message;
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
  async sendMessageToClass(
    data: SendMessageRequest & { turma_id: string; titulo: string }
  ): Promise<SendMessageResponse> {
    try {
      return await apiClient.post<SendMessageResponse>('/api/mobile/messages', {
        turma_id: data.turma_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'informativo',
        prioridade: data.prioridade || 'normal',
        anexo_url: data.anexo_url || null,
      });
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Responsável envia mensagem a um professor do aluno (abre conversa)
   */
  async sendMessageToTeacher(
    data: SendMessageRequest & { aluno_id: string; professor_id: string; titulo: string }
  ): Promise<Message> {
    try {
      const response = await apiClient.post<MessageResponse>('/api/mobile/messages', {
        aluno_id: data.aluno_id,
        professor_id: data.professor_id,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo || 'informativo',
        prioridade: data.prioridade || 'normal',
        anexo_url: data.anexo_url || null,
      });
      return response.message;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Responde em uma conversa existente
   */
  async replyToConversation(data: {
    conversa_id?: string;
    mensagem_pai_id?: string;
    conteudo: string;
    titulo?: string;
    tipo?: MessageType;
    prioridade?: MessagePriority;
  }): Promise<Message> {
    try {
      if (!data.conversa_id && !data.mensagem_pai_id) {
        throw new Error('Informe a conversa ou a mensagem para responder.');
      }

      const payload: Record<string, unknown> = {
        conteudo: data.conteudo,
      };

      if (data.conversa_id) payload.conversa_id = data.conversa_id;
      if (data.mensagem_pai_id) payload.mensagem_pai_id = data.mensagem_pai_id;
      if (data.titulo) payload.titulo = data.titulo;
      if (data.tipo) payload.tipo = data.tipo;
      if (data.prioridade) payload.prioridade = data.prioridade;

      const response = await apiClient.post<MessageResponse>('/api/mobile/messages', payload);
      return response.message;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao responder. Tente novamente.');
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
   * Marca toda a conversa como lida
   */
  async markConversationAsRead(conversaId: string): Promise<void> {
    try {
      await apiClient.patch<{ message: string; updated?: number }>(
        `/api/mobile/messages/conversas/${conversaId}/read`
      );
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao marcar conversa como lida.');
    }
  }

  /**
   * Conta mensagens não lidas (soma unread_count das conversas)
   */
  async getUnreadCount(aluno_id?: string): Promise<number> {
    try {
      const conversas = await this.getMessages({
        aluno_id,
        lida: false,
      });

      return conversas.reduce((total, item) => {
        if (typeof item.unread_count === 'number') {
          return total + item.unread_count;
        }
        return total + (item.lida ? 0 : 1);
      }, 0);
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

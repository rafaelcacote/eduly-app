import { API_CONFIG } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@eduly:token';

/**
 * Cliente HTTP base para fazer requisições à API
 */
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    console.log('API Client inicializado com URL:', this.baseURL);
  }

  /**
   * Obtém o token de autenticação do storage
   */
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }

  /**
   * Faz uma requisição HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Adiciona token de autenticação se existir
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Se não conseguir fazer parse do JSON, pode ser erro de servidor
        throw new Error('Erro no servidor. Tente novamente mais tarde.');
      }

      if (!response.ok) {
        // Trata erros de validação do Laravel
        if (data.errors) {
          const errorMessages = Object.values(data.errors)
            .flat()
            .join(', ');
          throw new Error(errorMessages || 'Erro de validação');
        }

        // Trata erros específicos do banco de dados
        if (data.message) {
          const message = data.message.toLowerCase();

          // Erro de tabela não encontrada (problema de configuração do backend)
          if (message.includes('personal_access_tokens') ||
            message.includes('não existe') ||
            message.includes('undefined table')) {
            throw new Error(
              'Erro de configuração do servidor. A tabela de autenticação não foi criada. ' +
              'Entre em contato com o suporte técnico.'
            );
          }

          // Erro de conexão com banco de dados
          if (message.includes('connection') || message.includes('conexão')) {
            throw new Error('Erro de conexão com o banco de dados. Tente novamente mais tarde.');
          }

          // Outros erros do Laravel
          throw new Error(data.message);
        }

        // Erro genérico baseado no status code
        if (response.status === 401) {
          throw new Error('Credenciais inválidas. Verifique seu CPF e senha.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Você não tem permissão para esta ação.');
        } else if (response.status === 404) {
          throw new Error('Recurso não encontrado.');
        } else if (response.status >= 500) {
          throw new Error('Erro no servidor. Tente novamente mais tarde.');
        }

        throw new Error('Erro na requisição. Tente novamente.');
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Log do erro para debug
      console.error('Erro na requisição:', {
        url,
        error: error.message || error,
        name: error.name,
        type: error.type,
      });

      if (error.name === 'AbortError') {
        throw new Error('Tempo de requisição excedido. Verifique sua conexão com o servidor.');
      }

      // Se já é um Error com mensagem tratada, apenas propaga
      if (error instanceof Error && error.message) {
        // Se for erro de rede conhecido, não propaga diretamente, trata abaixo
        const isNetworkError =
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_NAME_NOT_RESOLVED') ||
          error.message.includes('ERR_CONNECTION_TIMED_OUT') ||
          error.message.includes('Connection timed out') ||
          error.message.includes('timeout');

        if (!isNetworkError) {
          throw error;
        }
      }

      // Erro de conexão timeout (ERR_CONNECTION_TIMED_OUT)
      if (error.message && (
        error.message.includes('ERR_CONNECTION_TIMED_OUT') ||
        error.message.includes('Connection timed out') ||
        error.message.includes('timeout')
      )) {
        throw new Error(
          `Não foi possível conectar ao servidor em ${this.baseURL}. ` +
          `Verifique se o servidor está rodando e se o IP está correto.`
        );
      }

      // Erro de rede ou conexão
      if (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_NAME_NOT_RESOLVED')
      )) {
        throw new Error(
          `Erro de conexão com o servidor (${this.baseURL}). ` +
          `Verifique se o servidor está rodando e acessível na rede.`
        );
      }

      throw new Error('Erro ao conectar com o servidor. Verifique sua conexão.');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

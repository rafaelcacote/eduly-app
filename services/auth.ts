import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@eduly:token';
const USER_KEY = '@eduly:user';

export interface User {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string | null;
  avatar_url: string | null;
  type: 'teacher' | 'responsavel';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  cpf: string;
  password: string;
}

/**
 * Serviço de autenticação
 */
class AuthService {
  /**
   * Realiza login na API
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Remove formatação do CPF (pontos e traços)
      const cpfClean = credentials.cpf.replace(/[.-]/g, '');

      const response = await apiClient.post<LoginResponse>(
        '/api/mobile/login',
        {
          cpf: cpfClean,
          password: credentials.password,
        }
      );

      // Valida se a resposta contém os dados esperados
      if (!response || !response.token || !response.user) {
        throw new Error('Resposta inválida do servidor. Tente novamente.');
      }

      // Salva token e dados do usuário
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      // Propaga o erro já tratado pelo apiClient
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Erro ao fazer login. Tente novamente.');
    }
  }

  /**
   * Realiza logout
   */
  async logout(): Promise<void> {
    try {
      // Chama a API para invalidar o token
      await apiClient.post('/api/mobile/logout');
    } catch (error) {
      // Mesmo se a API falhar, limpa o storage local
      console.error('Erro ao fazer logout na API:', error);
    } finally {
      // Remove token e dados do usuário do storage
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  }

  /**
   * Obtém dados do usuário autenticado
   */
  async getMe(): Promise<User> {
    return apiClient.get<User>('/api/mobile/me');
  }

  /**
   * Verifica se o usuário está autenticado (tem token salvo)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Obtém o token salvo
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Obtém os dados do usuário salvos
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();

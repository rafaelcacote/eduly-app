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
  /** Alguns backends enviam foto_url para professor */
  foto_url?: string | null;
  type: 'teacher' | 'responsavel';
}

import { resolveMediaUrl } from '@/utils/mediaUrl';

/** URL da foto do usuário (avatar_url ou foto_url) */
export function getUserPhotoUrl(user?: Pick<User, 'avatar_url' | 'foto_url'> | null): string | null {
  if (!user) return null;
  return resolveMediaUrl(user.avatar_url || user.foto_url || null);
}

function normalizeUser(user: User): User {
  return {
    ...user,
    avatar_url: user.avatar_url || user.foto_url || null,
    telefone: user.telefone ?? null,
  };
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

      const normalized = {
        ...response,
        user: normalizeUser(response.user),
      };

      // Salva token e dados do usuário
      await AsyncStorage.setItem(TOKEN_KEY, normalized.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized.user));

      return normalized;
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
    const response = await apiClient.get<{ user: User } | User>('/api/mobile/me');
    const user = 'user' in response && response.user ? response.user : (response as User);
    return normalizeUser(user);
  }

  /**
   * Atualiza a foto de perfil do professor autenticado
   */
  async updatePhoto(params: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  }): Promise<User> {
    const formData = new FormData();
    const mimeType = params.mimeType || 'image/jpeg';
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = params.fileName || `foto.${extension}`;

    // Web: FormData precisa de Blob/File. Native: objeto { uri, type, name }.
    const isWebUri =
      typeof window !== 'undefined' &&
      (params.uri.startsWith('blob:') ||
        params.uri.startsWith('data:') ||
        params.uri.startsWith('http://') ||
        params.uri.startsWith('https://'));

    if (isWebUri) {
      const blobResponse = await fetch(params.uri);
      const blob = await blobResponse.blob();
      formData.append('foto', blob, fileName);
    } else {
      formData.append('foto', {
        uri: params.uri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    const response = await apiClient.postFormData<{ user: User }>('/api/mobile/me/foto', formData);
    if (!response?.user) {
      throw new Error('Resposta inválida do servidor. Tente novamente.');
    }

    const normalized = normalizeUser(response.user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
    return normalized;
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
      if (!userJson) return null;
      return normalizeUser(JSON.parse(userJson));
    } catch {
      return null;
    }
  }

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(params: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/api/mobile/me/password', {
      current_password: params.current_password,
      password: params.password,
      password_confirmation: params.password_confirmation,
    });
  }

  /**
   * Solicita e-mail com link para redefinir a senha
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/mobile/forgot-password', {
      email: email.trim().toLowerCase(),
    });
  }

  /**
   * Redefine a senha com o token recebido por e-mail
   */
  async resetPassword(params: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/mobile/reset-password', {
      email: params.email.trim().toLowerCase(),
      token: params.token,
      password: params.password,
      password_confirmation: params.password_confirmation,
    });
  }
}

export const authService = new AuthService();

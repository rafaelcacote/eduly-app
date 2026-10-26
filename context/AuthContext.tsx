import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, LoginCredentials } from '@/services/auth';
import { notificationsService } from '@/services/notifications';
import {
  authenticateWithBiometrics,
  isBiometricEnabled,
  promptToEnableBiometrics,
  setBiometricEnabled,
} from '@/services/biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Sessão salva, mas o usuário cancelou a digital/senha do celular. */
  biometricUnlockAvailable: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  unlockWithBiometrics: () => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePhoto: (params: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [biometricUnlockAvailable, setBiometricUnlockAvailable] = useState(false);

  /**
   * Carrega dados do usuário ao iniciar o app
   */
  useEffect(() => {
    loadStoredUser();
  }, []);

  /**
   * Valida se o usuário tem todos os campos obrigatórios
   */
  const isValidUser = (userData: any): userData is User => {
    return (
      userData &&
      typeof userData === 'object' &&
      userData.id &&
      userData.nome_completo &&
      userData.email &&
      userData.cpf &&
      userData.type &&
      typeof userData.id === 'string' &&
      typeof userData.nome_completo === 'string' &&
      typeof userData.email === 'string' &&
      typeof userData.cpf === 'string' &&
      (userData.type === 'teacher' || userData.type === 'responsavel')
    );
  };

  const clearStoredSession = async () => {
    try {
      await AsyncStorage.multiRemove(['@eduly:token', '@eduly:user']);
      await setBiometricEnabled(false);
    } catch (cleanError) {
      console.warn('Erro ao limpar storage:', cleanError);
    }
    setBiometricUnlockAvailable(false);
  };

  const restoreSessionFromServer = async (): Promise<User> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao carregar usuário')), 10000);
    });

    const loadPromise = (async () => {
      const updatedUser = await authService.getMe();
      if (!isValidUser(updatedUser)) {
        throw new Error('Resposta inválida do servidor');
      }

      try {
        await AsyncStorage.setItem('@eduly:user', JSON.stringify(updatedUser));
      } catch (saveError) {
        console.warn('Erro ao salvar usuário:', saveError);
      }

      return updatedUser;
    })();

    return Promise.race([loadPromise, timeoutPromise]);
  };

  const loadStoredUser = async () => {
    try {
      setIsLoading(true);
      setBiometricUnlockAvailable(false);

      const [storedUser, token, biometricOn] = await Promise.all([
        authService.getStoredUser(),
        authService.getToken(),
        isBiometricEnabled(),
      ]);

      if (!token || !storedUser || !isValidUser(storedUser)) {
        await clearStoredSession();
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      // A biometria fica fora do timeout: o usuário pode demorar para encostar o dedo.
      if (biometricOn) {
        const confirmed = await authenticateWithBiometrics();
        if (!confirmed) {
          setUser(null);
          setIsAuthenticated(false);
          setBiometricUnlockAvailable(true);
          return;
        }
      }

      try {
        const updatedUser = await restoreSessionFromServer();
        setUser(updatedUser);
        setIsAuthenticated(true);
        setBiometricUnlockAvailable(false);
      } catch (apiError: any) {
        console.log('Erro ao validar token:', apiError?.message || apiError);
        await clearStoredSession();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      console.error('Erro ou timeout ao carregar usuário:', error?.message || error);
      await clearStoredSession();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await authService.login(credentials);
    await promptToEnableBiometrics();
    setUser(response.user);
    setIsAuthenticated(true);
    setBiometricUnlockAvailable(false);

    notificationsService.registerPushToken().catch((err) =>
      console.warn('[Push] Failed to register token after login:', err)
    );

    return response.user;
  };

  const unlockWithBiometrics = async (): Promise<User | null> => {
    const confirmed = await authenticateWithBiometrics();
    if (!confirmed) return null;

    const updatedUser = await restoreSessionFromServer();
    setUser(updatedUser);
    setIsAuthenticated(true);
    setBiometricUnlockAvailable(false);
    return updatedUser;
  };

  const logout = async () => {
    try {
      // Remove push token antes de chamar logout (o token é enviado junto)
      await notificationsService.unregisterPushToken();
    } catch (error) {
      console.warn('[Push] Failed to unregister token before logout:', error);
    }

    try {
      await authService.logout();
      await setBiometricEnabled(false);
      setUser(null);
      setIsAuthenticated(false);
      setBiometricUnlockAvailable(false);
    } catch (error: any) {
      await setBiometricEnabled(false);
      setUser(null);
      setIsAuthenticated(false);
      setBiometricUnlockAvailable(false);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
      
      // Atualiza dados salvos
      await AsyncStorage.setItem('@eduly:user', JSON.stringify(updatedUser));
    } catch (error) {
      // Se falhar ao buscar, pode ser que o token tenha expirado
      throw error;
    }
  };

  const updatePhoto = async (params: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  }): Promise<User> => {
    const updatedUser = await authService.updatePhoto(params);
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        biometricUnlockAvailable,
        login,
        unlockWithBiometrics,
        logout,
        refreshUser,
        updatePhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar o contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

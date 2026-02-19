import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, LoginCredentials } from '@/services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const loadStoredUser = async () => {
    try {
      setIsLoading(true);
      
      // Timeout para evitar carregamento infinito
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar usuário')), 10000); // 10 segundos
      });

      const loadPromise = (async () => {
        try {
          const [storedUser, token] = await Promise.all([
            authService.getStoredUser(),
            authService.getToken(),
          ]);

          // Valida se tem token e usuário válido
          if (!token || !storedUser || !isValidUser(storedUser)) {
            // Limpa dados inconsistentes
            try {
              await AsyncStorage.multiRemove(['@eduly:token', '@eduly:user']);
            } catch (cleanError) {
              console.warn('Erro ao limpar storage:', cleanError);
            }
            setUser(null);
            setIsAuthenticated(false);
            return;
          }

          // Tenta obter dados atualizados do servidor
          try {
            const updatedUser = await authService.getMe();
            
            // Valida resposta do servidor
            if (!isValidUser(updatedUser)) {
              throw new Error('Resposta inválida do servidor');
            }

            setUser(updatedUser);
            setIsAuthenticated(true);

            // Atualiza dados salvos
            try {
              await AsyncStorage.setItem('@eduly:user', JSON.stringify(updatedUser));
            } catch (saveError) {
              console.warn('Erro ao salvar usuário:', saveError);
              // Continua mesmo se não conseguir salvar
            }
          } catch (apiError: any) {
            // Token inválido/expirado ou erro de conexão: limpa tudo e exige login
            console.log('Erro ao validar token:', apiError?.message || apiError);
            try {
              await AsyncStorage.multiRemove(['@eduly:token', '@eduly:user']);
            } catch (cleanError) {
              console.warn('Erro ao limpar storage após erro de API:', cleanError);
            }
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error: any) {
          console.error('Erro ao carregar usuário do storage:', error?.message || error);
          // Limpa dados em caso de erro
          try {
            await AsyncStorage.multiRemove(['@eduly:token', '@eduly:user']);
          } catch (cleanError) {
            console.warn('Erro ao limpar storage:', cleanError);
          }
          setUser(null);
          setIsAuthenticated(false);
        }
      })();

      // Aguarda com timeout
      await Promise.race([loadPromise, timeoutPromise]);
    } catch (error: any) {
      // Timeout ou outro erro: limpa estado e força login
      console.error('Erro ou timeout ao carregar usuário:', error?.message || error);
      try {
        await AsyncStorage.multiRemove(['@eduly:token', '@eduly:user']);
      } catch (cleanError) {
        console.warn('Erro ao limpar storage:', cleanError);
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      // Sempre finaliza o loading
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response.user;
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error: any) {
      // Mesmo se falhar, limpa o estado local
      setUser(null);
      setIsAuthenticated(false);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
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

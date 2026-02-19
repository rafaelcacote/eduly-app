import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { StudentProvider } from '@/context/StudentContext';
import { Colors } from '@/constants/colors';

// Mantém a splash screen visível até que o app esteja pronto
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  // Garante que tem tanto isAuthenticated quanto user válido
  const hasSession = isAuthenticated && !!user && !!user.id;

  useEffect(() => {
    if (isLoading) return; // Aguarda o carregamento do estado de autenticação

    const currentSegment = segments[0] || '';
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'forgot-password';
    
    // Rotas protegidas que exigem autenticação
    const protectedRoutes = [
      '(tabs)',
      'teacher-dashboard',
      'messages',
      'send-message',
      'exercises',
      'create-exercise',
      'exams',
      'create-exam',
      'report',
      'message-detail',
    ];

    // Se não estiver autenticado e tentar acessar rota protegida, redireciona para login
    if (!hasSession) {
      if (protectedRoutes.includes(currentSegment) || currentSegment === '') {
        // Evita loop infinito de redirecionamento
        if (currentSegment !== 'login') {
          router.replace('/login');
        }
      }
      return;
    }

    // Se estiver autenticado e tentar acessar login/register, redireciona para home correta
    if (hasSession && inAuthGroup) {
      router.replace(user?.type === 'teacher' ? '/teacher-dashboard' : '/(tabs)');
      return;
    }

    // Se estiver autenticado na raiz, envia para a home do perfil
    if (hasSession && currentSegment === '') {
      router.replace(user?.type === 'teacher' ? '/teacher-dashboard' : '/(tabs)');
    }
  }, [hasSession, isLoading, segments, router, user?.type]);

  // Esconde a splash screen quando o app terminar de carregar
  useEffect(() => {
    if (!isLoading) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Enquanto está carregando, mostra apenas o loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  // Se não estiver autenticado, só renderiza telas de autenticação
  if (!hasSession) {
    const currentSegment = segments[0] || '';
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'forgot-password';
    
    // Se não estiver na tela de autenticação, mostra loading até redirecionar
    if (!inAuthGroup) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    
    // Renderiza apenas telas de autenticação quando não está logado
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  // Renderiza todas as telas quando autenticado
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teacher-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="message-detail" options={{ headerShown: false }} />
        <Stack.Screen name="send-message" options={{ headerShown: false }} />
        <Stack.Screen name="exercises" options={{ headerShown: false }} />
        <Stack.Screen name="create-exercise" options={{ headerShown: false }} />
        <Stack.Screen name="exams" options={{ headerShown: false }} />
        <Stack.Screen name="create-exam" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StudentProvider>
        <RootLayoutNav />
      </StudentProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

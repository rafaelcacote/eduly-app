import { LoadingSquares } from '@/components/loading-squares';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Função para formatar CPF
const formatCPF = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Validações
      if (!cpf || !password) {
        setError('Por favor, preencha todos os campos');
        setIsLoading(false);
        return;
      }

      // Remove formatação do CPF para validação
      const cpfClean = cpf.replace(/\D/g, '');

      if (cpfClean.length !== 11) {
        setError('CPF deve ter 11 dígitos');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Senha deve ter pelo menos 6 caracteres');
        setIsLoading(false);
        return;
      }

      // Realiza login
      const loggedUser = await login({
        cpf: cpfClean,
        password,
      });

      // Redireciona conforme o perfil do usuário
      if (loggedUser.type === 'teacher') {
        router.replace('/teacher-dashboard');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.background}>
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </View>

        <View style={styles.card}>
          <LinearGradient
            colors={Colors.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.iconContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={styles.title}>Agenda Escolar</Text>
            <Text style={styles.subtitle}>Acesse sua conta</Text>
          </LinearGradient>

          <View style={styles.content}>
            {error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={18} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>CPF</Text>
              <View style={styles.inputWrapper}>
                <UserIcon size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="000.000.000-00"
                  placeholderTextColor={Colors.textMuted}
                  value={cpf}
                  onChangeText={handleCpfChange}
                  keyboardType="numeric"
                  maxLength={14}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textMuted} />
                  ) : (
                    <Eye size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            >
              <LinearGradient
                colors={Colors.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <LoadingSquares squareSize={12} gap={6} colors={['#ffffff', '#ffffff', '#ffffff']} />
                    <Text style={styles.submitButtonText}>Entrando...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.linkText}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 Agenda Escolar. Todos os direitos reservados.
            </Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf2ff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -220,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#93c5fd',
    opacity: 0.26,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -230,
    left: -140,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#c4b5fd',
    opacity: 0.24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 18,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
  },
  header: {
    paddingTop: 34,
    paddingHorizontal: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 250,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 7,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe4f0',
    borderRadius: 14,
    backgroundColor: '#f8fbff',
    paddingHorizontal: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    padding: 6,
    marginRight: -2,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 7,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  linksContainer: {
    marginTop: 18,
    gap: 10,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  registerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});


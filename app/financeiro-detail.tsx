import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import {
  Cobranca,
  CobrancaStatusExibicao,
  COBRANCA_TIPO_LABELS,
  formatCurrencyBRL,
  formatDateBR,
  financeiroService,
} from '@/services/financeiro';
import { openAttachment } from '@/utils/attachment';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Copy, FileText } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function statusTone(status: CobrancaStatusExibicao): { bg: string; text: string } {
  switch (status) {
    case 'pago':
      return { bg: '#d1fae5', text: Colors.success };
    case 'atrasado':
      return { bg: '#fee2e2', text: Colors.error };
    case 'cancelado':
      return { bg: '#f3f4f6', text: Colors.textSecondary };
    case 'pendente':
    default:
      return { bg: '#fef3c7', text: Colors.warning };
  }
}

function showAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

function truncateMiddle(value: string, max = 48): string {
  if (value.length <= max) return value;
  const keep = Math.floor((max - 3) / 2);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export default function FinanceiroDetailScreen() {
  const router = useRouter();
  const { cobrancaId } = useLocalSearchParams<{ cobrancaId: string }>();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { selectedStudent } = useStudent();
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type === 'teacher') {
      router.replace('/teacher-dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!cobrancaId || !selectedStudent?.id) {
      if (!isLoadingAuth && isAuthenticated && !selectedStudent?.id) {
        setIsLoading(false);
      }
      return;
    }

    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await financeiroService.getCobrancaById(
          selectedStudent.id,
          cobrancaId
        );
        if (active) setCobranca(data);
      } catch (error: any) {
        showAlert(
          'Erro',
          error?.message || 'Não foi possível carregar a cobrança.',
          () => router.back()
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [cobrancaId, selectedStudent?.id, isAuthenticated, isLoadingAuth, router]);

  const showToast = () => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  };

  const copyText = async (value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      showToast();
    } catch {
      showAlert('Erro', 'Não foi possível copiar. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Cobrança" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando cobrança...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!selectedStudent) {
    return (
      <View style={styles.container}>
        <AppHeader title="Cobrança" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Selecione um aluno na tela inicial</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!cobranca) {
    return (
      <View style={styles.container}>
        <AppHeader title="Cobrança" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Cobrança não disponível</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  const tone = statusTone(cobranca.status_exibicao);
  const hasBoleto = !!cobranca.boleto_url;
  const hasPix = !!(cobranca.pix_chave || cobranca.pix_copia_cola);
  const hasPaymentData = hasBoleto || hasPix;
  const awaitsPayment =
    cobranca.status_exibicao === 'pendente' || cobranca.status_exibicao === 'atrasado';

  return (
    <View style={styles.container}>
      <AppHeader title="Cobrança" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {cobranca.status_label || cobranca.status_exibicao}
            </Text>
          </View>
          <Text style={styles.title}>
            {cobranca.titulo ||
              cobranca.tipo_label ||
              COBRANCA_TIPO_LABELS[cobranca.tipo]}
          </Text>
          <Text style={styles.value}>{formatCurrencyBRL(cobranca.valor)}</Text>
          <Text style={styles.meta}>
            {cobranca.tipo_label || COBRANCA_TIPO_LABELS[cobranca.tipo]} · Vencimento{' '}
            {formatDateBR(cobranca.vencimento)}
          </Text>
          {cobranca.pago_em ? (
            <Text style={styles.meta}>Pago em {formatDateBR(cobranca.pago_em)}</Text>
          ) : null}
        </View>

        {cobranca.descricao ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.sectionBody}>{cobranca.descricao}</Text>
          </View>
        ) : null}

        {cobranca.referencia ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referência</Text>
            <Text style={styles.sectionBody}>{cobranca.referencia}</Text>
          </View>
        ) : null}

        {hasBoleto ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boleto</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => openAttachment(cobranca.boleto_url)}
            >
              <FileText size={18} color={Colors.white} />
              <Text style={styles.primaryButtonText}>Abrir boleto</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hasPix ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PIX</Text>

            {cobranca.pix_chave ? (
              <View style={styles.pixBlock}>
                <Text style={styles.pixLabel}>Chave PIX</Text>
                <Text style={styles.pixValue} selectable>
                  {cobranca.pix_chave}
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => copyText(cobranca.pix_chave!)}
                >
                  <Copy size={16} color={Colors.primary} />
                  <Text style={styles.secondaryButtonText}>Copiar chave</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {cobranca.pix_copia_cola ? (
              <View style={styles.pixBlock}>
                <Text style={styles.pixLabel}>Copia e cola</Text>
                <Text style={styles.pixValue} selectable>
                  {truncateMiddle(cobranca.pix_copia_cola, 56)}
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => copyText(cobranca.pix_copia_cola!)}
                >
                  <Copy size={16} color={Colors.primary} />
                  <Text style={styles.secondaryButtonText}>Copiar PIX</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {awaitsPayment && !hasPaymentData ? (
          <View style={[styles.section, styles.warnSection]}>
            <Text style={styles.sectionTitle}>Pagamento</Text>
            <Text style={styles.sectionBody}>
              Dados de pagamento ainda não disponíveis. Fale com a escola.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {toastVisible ? (
        <View style={styles.toast} pointerEvents="none">
          <Check size={16} color={Colors.white} />
          <Text style={styles.toastText}>PIX copiado</Text>
        </View>
      ) : null}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  meta: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  warnSection: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionBody: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  pixBlock: {
    gap: 8,
  },
  pixLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pixValue: {
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.muted,
    borderRadius: 10,
    padding: 12,
    lineHeight: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#dbeafe',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 96,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  toastText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

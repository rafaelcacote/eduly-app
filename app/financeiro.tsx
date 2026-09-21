import { AppHeader } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import {
  Cobranca,
  CobrancaStatusExibicao,
  CobrancaTipo,
  COBRANCA_TIPO_LABELS,
  formatCurrencyBRL,
  formatDateBR,
  financeiroService,
} from '@/services/financeiro';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, PartyPopper, Wallet } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type StatusTab = 'pendente' | 'pago' | 'atrasado';

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'pendente', label: 'Em aberto' },
  { key: 'atrasado', label: 'Atrasadas' },
  { key: 'pago', label: 'Pagas' },
];

type TipoFilter = 'todos' | CobrancaTipo;

const TIPO_FILTERS: { key: TipoFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'mensalidade', label: 'Mensalidade' },
  { key: 'evento', label: 'Evento' },
];

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

function TipoIcon({ tipo }: { tipo: CobrancaTipo }) {
  if (tipo === 'evento') {
    return <PartyPopper size={18} color={Colors.secondary} />;
  }
  return <CalendarDays size={18} color={Colors.primary} />;
}

function emptyMessageFor(tab: StatusTab): string {
  if (tab === 'pago') return 'Nenhuma cobrança paga';
  if (tab === 'atrasado') return 'Nenhuma cobrança atrasada';
  return 'Nenhuma cobrança em aberto';
}

export default function FinanceiroScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { selectedStudent } = useStudent();

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('pendente');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  const [anoFilter, setAnoFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const anoOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  React.useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user?.type === 'teacher') {
      router.replace('/teacher-dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, user?.type, router]);

  const loadCobrancas = useCallback(
    async (opts?: { silent?: boolean; page?: number; append?: boolean }) => {
      if (!selectedStudent?.id) {
        setCobrancas([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        return;
      }

      const targetPage = opts?.page ?? 1;

      try {
        if (!opts?.silent && !opts?.append) {
          setError(null);
        }
        const result = await financeiroService.getCobrancas(selectedStudent.id, {
          status: activeTab,
          tipo: tipoFilter === 'todos' ? undefined : tipoFilter,
          ano: anoFilter ?? undefined,
          page: targetPage,
          per_page: 20,
        });
        setCobrancas((prev) =>
          opts?.append ? [...prev, ...result.cobrancas] : result.cobrancas
        );
        setPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
      } catch (err: any) {
        console.error('Erro ao carregar cobranças:', err);
        setError(err?.message || 'Erro ao carregar cobranças');
        if (!opts?.append) {
          setCobrancas([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [selectedStudent?.id, activeTab, tipoFilter, anoFilter]
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setPage(1);
      loadCobrancas({ page: 1 });
    }, [loadCobrancas])
  );

  const handleLoadMore = () => {
    if (isLoadingMore || page >= lastPage) return;
    setIsLoadingMore(true);
    loadCobrancas({ silent: true, page: page + 1, append: true });
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <AppHeader title="Financeiro" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando cobranças...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Financeiro"
        subtitle={
          selectedStudent
            ? selectedStudent.nome_social || selectedStudent.nome
            : undefined
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, active && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {TIPO_FILTERS.map((f) => {
          const active = tipoFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setTipoFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.filterDivider} />
        <TouchableOpacity
          style={[styles.filterChip, anoFilter === null && styles.filterChipActive]}
          onPress={() => setAnoFilter(null)}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.filterText,
              anoFilter === null && styles.filterTextActive,
            ]}
          >
            Todos os anos
          </Text>
        </TouchableOpacity>
        {anoOptions.map((ano) => {
          const active = anoFilter === ano;
          return (
            <TouchableOpacity
              key={ano}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setAnoFilter(ano)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {ano}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadCobrancas({ page: 1 });
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadCobrancas({ silent: true, page: 1 });
            }}
          />
        }
      >
        {!selectedStudent ? (
          <View style={styles.emptyContainer}>
            <Wallet size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Selecione um aluno na tela inicial</Text>
          </View>
        ) : cobrancas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wallet size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{emptyMessageFor(activeTab)}</Text>
            <Text style={styles.emptyHint}>
              Quando a escola lançar mensalidades ou eventos, elas aparecerão aqui.
            </Text>
          </View>
        ) : (
          <>
            {cobrancas.map((item) => {
              const tone = statusTone(item.status_exibicao);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.72}
                  onPress={() =>
                    router.push({
                      pathname: '/financeiro-detail',
                      params: { cobrancaId: item.id },
                    })
                  }
                >
                  <View style={styles.cardIcon}>
                    <TipoIcon tipo={item.tipo} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.titulo || item.tipo_label}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.tipo_label || COBRANCA_TIPO_LABELS[item.tipo]} · Venc.{' '}
                      {formatDateBR(item.vencimento)}
                    </Text>
                    <Text style={styles.cardValue}>{formatCurrencyBRL(item.valor)}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.text }]}>
                      {item.status_label || item.status_exibicao}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {page < lastPage ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={isLoadingMore}
                activeOpacity={0.85}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Carregar mais</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>

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
  tabsScroll: {
    maxHeight: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.muted,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  filtersScroll: {
    maxHeight: 48,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.muted,
  },
  filterChipActive: {
    backgroundColor: '#dbeafe',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  errorContainer: {
    margin: 16,
    padding: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  retryButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 88,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadMoreButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});

import { AppHeader, AppHeaderAction } from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useStudent } from '@/context/StudentContext';
import {
  Documento,
  DOCUMENTO_STATUS_LABELS,
  DOCUMENTO_TIPO_LABELS,
  DocumentoStatus,
  DocumentoTipo,
  documentosService,
} from '@/services/documentos';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  FileText,
  Plus,
  Stethoscope,
  ScrollText,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TabKey = 'todos' | DocumentoTipo;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'atestado', label: 'Atestados' },
  { key: 'pedido_declaracao', label: 'Pedidos' },
  { key: 'documento_escola', label: 'Da escola' },
];

function statusTone(status: DocumentoStatus): { bg: string; text: string } {
  switch (status) {
    case 'aprovado':
    case 'atendido':
    case 'disponivel':
      return { bg: '#d1fae5', text: Colors.success };
    case 'recusado':
    case 'cancelado':
      return { bg: '#fee2e2', text: Colors.error };
    case 'em_analise':
      return { bg: '#fef3c7', text: Colors.warning };
    case 'enviado':
    default:
      return { bg: '#dbeafe', text: Colors.primary };
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function TipoIcon({ tipo }: { tipo: DocumentoTipo }) {
  if (tipo === 'atestado') {
    return <Stethoscope size={18} color={Colors.primary} />;
  }
  if (tipo === 'pedido_declaracao') {
    return <ScrollText size={18} color={Colors.secondary} />;
  }
  return <FileText size={18} color={Colors.success} />;
}

export default function DocumentosScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { selectedStudent } = useStudent();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [showNewMenu, setShowNewMenu] = useState(false);

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

  const loadDocumentos = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!selectedStudent?.id) {
        setDocumentos([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (!opts?.silent) {
          setError(null);
        }
        const data = await documentosService.getDocumentos(selectedStudent.id);
        setDocumentos(data);
      } catch (err: any) {
        console.error('Erro ao carregar documentos:', err);
        setError(err?.message || 'Erro ao carregar documentos');
        setDocumentos([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStudent?.id]
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadDocumentos();
    }, [loadDocumentos])
  );

  const filtered = useMemo(() => {
    if (activeTab === 'todos') return documentos;
    return documentos.filter((d) => d.tipo === activeTab);
  }, [documentos, activeTab]);

  const emptyMessage = useMemo(() => {
    if (activeTab === 'atestado') return 'Nenhum atestado enviado';
    if (activeTab === 'pedido_declaracao') return 'Nenhum pedido de declaração';
    if (activeTab === 'documento_escola') return 'Nenhum documento da escola';
    return 'Nenhum documento ainda';
  }, [activeTab]);

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <AppHeader title="Documentos" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando documentos...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Documentos"
        subtitle={
          selectedStudent
            ? selectedStudent.nome_social || selectedStudent.nome
            : undefined
        }
        right={
          <AppHeaderAction
            onPress={() => setShowNewMenu(true)}
            accessibilityLabel="Novo documento"
          >
            <Plus size={20} color={Colors.white} />
          </AppHeaderAction>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {TABS.map((tab) => {
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

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadDocumentos();
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
              loadDocumentos({ silent: true });
            }}
          />
        }
      >
        {!selectedStudent ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Selecione um aluno na tela inicial</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
            <Text style={styles.emptyHint}>
              Envie um atestado médico ou peça uma declaração à secretaria.
            </Text>
          </View>
        ) : (
          filtered.map((doc) => {
            const tone = statusTone(doc.status);
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.card}
                activeOpacity={0.72}
                onPress={() =>
                  router.push({
                    pathname: '/documento-detail',
                    params: { documentoId: doc.id },
                  })
                }
              >
                <View style={styles.cardIcon}>
                  <TipoIcon tipo={doc.tipo} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {doc.titulo || DOCUMENTO_TIPO_LABELS[doc.tipo]}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {DOCUMENTO_TIPO_LABELS[doc.tipo]} · {formatDate(doc.criado_em)}
                  </Text>
                  {doc.tipo === 'atestado' && (doc.data_inicio || doc.data_fim) ? (
                    <Text style={styles.cardPeriod} numberOfLines={1}>
                      Falta: {formatDate(doc.data_inicio)} — {formatDate(doc.data_fim)}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusText, { color: tone.text }]}>
                    {DOCUMENTO_STATUS_LABELS[doc.status] || doc.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showNewMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowNewMenu(false)}
        >
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>O que deseja fazer?</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowNewMenu(false);
                router.push('/enviar-atestado');
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#dbeafe' }]}>
                <Stethoscope size={18} color={Colors.primary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Enviar atestado</Text>
                <Text style={styles.menuItemHint}>Justificar falta por doença</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowNewMenu(false);
                router.push('/pedir-declaracao');
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#e0e7ff' }]}>
                <ScrollText size={18} color={Colors.secondary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Pedir declaração</Text>
                <Text style={styles.menuItemHint}>Solicitar documento à escola</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  cardPeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  menuItemHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

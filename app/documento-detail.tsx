import { AppHeader } from '@/components/AppHeader';
import { AttachmentCard } from '@/components/AttachmentCard';
import BottomNav from '@/components/BottomNav';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import {
  CATEGORIA_DECLARACAO_LABELS,
  CategoriaDeclaracao,
  Documento,
  DOCUMENTO_STATUS_LABELS,
  DOCUMENTO_TIPO_LABELS,
  DocumentoStatus,
  documentosService,
} from '@/services/documentos';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
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

export default function DocumentoDetailScreen() {
  const router = useRouter();
  const { documentoId } = useLocalSearchParams<{ documentoId: string }>();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!documentoId) return;

    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await documentosService.getDocumentoById(documentoId);
        if (active) setDocumento(data);
      } catch (error: any) {
        showAlert(
          'Erro',
          error?.message || 'Não foi possível carregar o documento.',
          () => router.back()
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [documentoId, router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Documento" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando documento...</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!documento) {
    return (
      <View style={styles.container}>
        <AppHeader title="Documento" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Documento não disponível</Text>
        </View>
        <BottomNav />
      </View>
    );
  }

  const tone = statusTone(documento.status);
  const categoriaLabel =
    documento.categoria_declaracao &&
    CATEGORIA_DECLARACAO_LABELS[documento.categoria_declaracao as CategoriaDeclaracao]
      ? CATEGORIA_DECLARACAO_LABELS[
          documento.categoria_declaracao as CategoriaDeclaracao
        ]
      : documento.categoria_declaracao;

  return (
    <View style={styles.container}>
      <AppHeader title={DOCUMENTO_TIPO_LABELS[documento.tipo] || 'Documento'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {DOCUMENTO_STATUS_LABELS[documento.status] || documento.status}
            </Text>
          </View>
          <Text style={styles.title}>
            {documento.titulo || DOCUMENTO_TIPO_LABELS[documento.tipo]}
          </Text>
          <Text style={styles.meta}>
            Enviado em {formatDateTime(documento.criado_em)}
          </Text>
        </View>

        {documento.tipo === 'atestado' && (documento.data_inicio || documento.data_fim) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Período da falta</Text>
            <Text style={styles.sectionBody}>
              {formatDate(documento.data_inicio)} — {formatDate(documento.data_fim)}
            </Text>
          </View>
        ) : null}

        {documento.tipo === 'pedido_declaracao' && categoriaLabel ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de declaração</Text>
            <Text style={styles.sectionBody}>{categoriaLabel}</Text>
          </View>
        ) : null}

        {documento.descricao ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observação</Text>
            <Text style={styles.sectionBody}>{documento.descricao}</Text>
          </View>
        ) : null}

        {documento.motivo_recusa ? (
          <View style={[styles.section, styles.refuseSection]}>
            <Text style={styles.sectionTitle}>Motivo da recusa</Text>
            <Text style={[styles.sectionBody, { color: Colors.error }]}>
              {documento.motivo_recusa}
            </Text>
          </View>
        ) : null}

        {documento.anexo_url ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {documento.tipo === 'documento_escola' ? 'Arquivo' : 'Anexo enviado'}
            </Text>
            <AttachmentCard url={documento.anexo_url} tone="comunicado" />
          </View>
        ) : null}

        {documento.anexo_resposta_url ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resposta da escola</Text>
            <AttachmentCard url={documento.anexo_resposta_url} tone="recado" />
          </View>
        ) : null}
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
    gap: 8,
  },
  refuseSection: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
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
});

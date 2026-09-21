import { apiClient } from './api';

export type CobrancaTipo = 'mensalidade' | 'evento';

export type CobrancaStatus = 'pendente' | 'pago' | 'cancelado';

/** Status usado na UI / filtros (backend deriva `atrasado` de pendente + vencido). */
export type CobrancaStatusExibicao = 'pendente' | 'pago' | 'cancelado' | 'atrasado';

export const COBRANCA_TIPO_LABELS: Record<CobrancaTipo, string> = {
  mensalidade: 'Mensalidade',
  evento: 'Evento',
};

export const COBRANCA_STATUS_LABELS: Record<CobrancaStatusExibicao, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  atrasado: 'Atrasado',
};

export interface Cobranca {
  id: string;
  aluno_id: string;
  tipo: CobrancaTipo;
  tipo_label: string;
  titulo: string;
  descricao: string | null;
  referencia: string | null;
  valor: number;
  vencimento: string;
  status: CobrancaStatus;
  status_exibicao: CobrancaStatusExibicao;
  status_label: string;
  esta_atrasada: boolean;
  pago_em: string | null;
  boleto_url: string | null;
  pix_copia_cola: string | null;
  pix_chave: string | null;
  pix_qrcode_url: string | null;
  evento_financeiro_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CobrancasMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CobrancasListResult {
  cobrancas: Cobranca[];
  meta: CobrancasMeta;
}

export type ListCobrancasParams = {
  status?: CobrancaStatusExibicao;
  tipo?: CobrancaTipo;
  ano?: number;
  page?: number;
  per_page?: number;
};

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function normalizeCobranca(raw: unknown): Cobranca {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tipo = (item.tipo as CobrancaTipo) || 'mensalidade';
  const status = (item.status as CobrancaStatus) || 'pendente';
  const statusExibicao =
    (item.status_exibicao as CobrancaStatusExibicao) ||
    (item.esta_atrasada ? 'atrasado' : status);

  return {
    id: String(item.id ?? ''),
    aluno_id: String(item.aluno_id ?? ''),
    tipo,
    tipo_label:
      asNullableString(item.tipo_label) ||
      COBRANCA_TIPO_LABELS[tipo] ||
      String(item.tipo ?? ''),
    titulo: String(item.titulo ?? ''),
    descricao: asNullableString(item.descricao),
    referencia: asNullableString(item.referencia),
    valor: asNumber(item.valor),
    vencimento: String(item.vencimento ?? ''),
    status,
    status_exibicao: statusExibicao,
    status_label:
      asNullableString(item.status_label) ||
      COBRANCA_STATUS_LABELS[statusExibicao] ||
      statusExibicao,
    esta_atrasada: Boolean(item.esta_atrasada) || statusExibicao === 'atrasado',
    pago_em: asNullableString(item.pago_em),
    boleto_url: asNullableString(item.boleto_url),
    pix_copia_cola: asNullableString(item.pix_copia_cola),
    pix_chave: asNullableString(item.pix_chave),
    pix_qrcode_url: asNullableString(item.pix_qrcode_url),
    evento_financeiro_id: asNullableString(item.evento_financeiro_id),
    created_at: String(item.created_at ?? ''),
    updated_at: String(item.updated_at ?? ''),
  };
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.cobrancas)) return obj.cobrancas;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

function extractMeta(data: unknown): CobrancasMeta {
  const defaults: CobrancasMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };
  if (!data || typeof data !== 'object') return defaults;
  const meta = (data as { meta?: Record<string, unknown> }).meta;
  if (!meta || typeof meta !== 'object') {
    const list = extractList(data);
    return { ...defaults, total: list.length };
  }
  return {
    current_page: asNumber(meta.current_page, 1),
    last_page: asNumber(meta.last_page, 1),
    per_page: asNumber(meta.per_page, 20),
    total: asNumber(meta.total, 0),
  };
}

function buildQuery(params?: ListCobrancasParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.tipo) qs.set('tipo', params.tipo);
  if (params.ano != null) qs.set('ano', String(params.ano));
  if (params.page != null) qs.set('page', String(params.page));
  if (params.per_page != null) qs.set('per_page', String(params.per_page));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

class FinanceiroService {
  async getCobrancas(
    alunoId: string,
    params?: ListCobrancasParams
  ): Promise<CobrancasListResult> {
    const query = buildQuery(params);
    const response = await apiClient.get<unknown>(
      `/api/mobile/students/${encodeURIComponent(alunoId)}/cobrancas${query}`
    );
    const cobrancas = extractList(response)
      .map(normalizeCobranca)
      .filter((c) => !!c.id);
    const meta = extractMeta(response);
    if (meta.total === 0 && cobrancas.length > 0) {
      meta.total = cobrancas.length;
    }
    return { cobrancas, meta };
  }

  async getCobrancaById(alunoId: string, cobrancaId: string): Promise<Cobranca> {
    const response = await apiClient.get<unknown>(
      `/api/mobile/students/${encodeURIComponent(alunoId)}/cobrancas/${encodeURIComponent(cobrancaId)}`
    );
    const raw =
      response && typeof response === 'object' && 'cobranca' in (response as object)
        ? (response as { cobranca: unknown }).cobranca
        : response && typeof response === 'object' && 'data' in (response as object)
          ? (response as { data: unknown }).data
          : response;
    const cobranca = normalizeCobranca(raw);
    if (!cobranca.id) {
      throw new Error('Cobrança não encontrada.');
    }
    return cobranca;
  }
}

export const financeiroService = new FinanceiroService();

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

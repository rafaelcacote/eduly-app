import { apiClient } from './api';

export type DocumentoTipo = 'atestado' | 'pedido_declaracao' | 'documento_escola';

export type DocumentoStatus =
  | 'enviado'
  | 'em_analise'
  | 'aprovado'
  | 'recusado'
  | 'atendido'
  | 'disponivel'
  | 'cancelado';

export type CategoriaDeclaracao =
  | 'matricula'
  | 'frequencia'
  | 'transferencia'
  | 'conclusao'
  | 'outro';

export const CATEGORIA_DECLARACAO_LABELS: Record<CategoriaDeclaracao, string> = {
  matricula: 'Declaração de matrícula',
  frequencia: 'Declaração de frequência',
  transferencia: 'Declaração de transferência',
  conclusao: 'Declaração de conclusão',
  outro: 'Outro',
};

export const DOCUMENTO_TIPO_LABELS: Record<DocumentoTipo, string> = {
  atestado: 'Atestado médico',
  pedido_declaracao: 'Pedido de declaração',
  documento_escola: 'Documento da escola',
};

export const DOCUMENTO_STATUS_LABELS: Record<DocumentoStatus, string> = {
  enviado: 'Enviado',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  atendido: 'Atendido',
  disponivel: 'Disponível',
  cancelado: 'Cancelado',
};

export interface Documento {
  id: string;
  aluno_id: string;
  tipo: DocumentoTipo;
  status: DocumentoStatus;
  titulo: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  categoria_declaracao: CategoriaDeclaracao | string | null;
  anexo_url: string | null;
  anexo_resposta_url: string | null;
  motivo_recusa: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type DocumentoAnexoFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export type CreateAtestadoInput = {
  aluno_id: string;
  data_inicio: string;
  data_fim: string;
  descricao?: string;
  titulo?: string;
  anexo: DocumentoAnexoFile;
};

export type CreatePedidoDeclaracaoInput = {
  aluno_id: string;
  categoria_declaracao: CategoriaDeclaracao;
  descricao?: string;
  titulo?: string;
  anexo?: DocumentoAnexoFile;
};

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function normalizeDocumento(raw: unknown): Documento {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? ''),
    aluno_id: String(item.aluno_id ?? ''),
    tipo: (item.tipo as DocumentoTipo) || 'documento_escola',
    status: (item.status as DocumentoStatus) || 'enviado',
    titulo: String(item.titulo ?? ''),
    descricao: (item.descricao as string | null) ?? null,
    data_inicio: (item.data_inicio as string | null) ?? null,
    data_fim: (item.data_fim as string | null) ?? null,
    categoria_declaracao:
      (item.categoria_declaracao as CategoriaDeclaracao | string | null) ?? null,
    anexo_url: (item.anexo_url as string | null) ?? null,
    anexo_resposta_url: (item.anexo_resposta_url as string | null) ?? null,
    motivo_recusa: (item.motivo_recusa as string | null) ?? null,
    criado_em: String(item.criado_em ?? item.created_at ?? ''),
    atualizado_em: String(item.atualizado_em ?? item.updated_at ?? ''),
  };
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.documentos)) return obj.documentos;
  }
  return [];
}

function guessMimeType(fileName?: string | null, mimeType?: string | null): string {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return mimeType || 'application/octet-stream';
}

function validateAnexo(file: DocumentoAnexoFile) {
  const mime = guessMimeType(file.fileName, file.mimeType);
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('Envie apenas PDF, JPG ou PNG.');
  }
}

async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  file: DocumentoAnexoFile
) {
  validateAnexo(file);
  const mimeType = guessMimeType(file.fileName, file.mimeType);
  const extension =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const fileName = file.fileName || `anexo.${extension}`;

  const isWebUri =
    typeof window !== 'undefined' &&
    (file.uri.startsWith('blob:') ||
      file.uri.startsWith('data:') ||
      file.uri.startsWith('http://') ||
      file.uri.startsWith('https://'));

  if (isWebUri) {
    const blobResponse = await fetch(file.uri);
    const blob = await blobResponse.blob();
    if (blob.size > MAX_FILE_BYTES) {
      throw new Error('O arquivo deve ter no máximo 10 MB.');
    }
    formData.append(fieldName, blob, fileName);
  } else {
    formData.append(fieldName, {
      uri: file.uri,
      type: mimeType,
      name: fileName,
    } as any);
  }
}

class DocumentosService {
  async getDocumentos(alunoId: string): Promise<Documento[]> {
    const response = await apiClient.get<unknown>(
      `/api/mobile/documentos?aluno_id=${encodeURIComponent(alunoId)}`
    );
    return extractList(response).map(normalizeDocumento).filter((d) => !!d.id);
  }

  async getDocumentoById(id: string): Promise<Documento> {
    const response = await apiClient.get<unknown>(`/api/mobile/documentos/${id}`);
    const raw =
      response && typeof response === 'object' && 'documento' in (response as object)
        ? (response as { documento: unknown }).documento
        : response && typeof response === 'object' && 'data' in (response as object)
          ? (response as { data: unknown }).data
          : response;
    const doc = normalizeDocumento(raw);
    if (!doc.id) {
      throw new Error('Documento não encontrado.');
    }
    return doc;
  }

  async createAtestado(input: CreateAtestadoInput): Promise<Documento> {
    const formData = new FormData();
    formData.append('aluno_id', input.aluno_id);
    formData.append('tipo', 'atestado');
    formData.append('data_inicio', input.data_inicio);
    formData.append('data_fim', input.data_fim);
    formData.append(
      'titulo',
      input.titulo?.trim() || 'Atestado médico'
    );
    if (input.descricao?.trim()) {
      formData.append('descricao', input.descricao.trim());
    }
    await appendFileToFormData(formData, 'anexo', input.anexo);

    const response = await apiClient.postFormData<unknown>(
      '/api/mobile/documentos',
      formData
    );
    return this.unwrapDocumento(response);
  }

  async createPedidoDeclaracao(input: CreatePedidoDeclaracaoInput): Promise<Documento> {
    if (input.anexo) {
      const formData = new FormData();
      formData.append('aluno_id', input.aluno_id);
      formData.append('tipo', 'pedido_declaracao');
      formData.append('categoria_declaracao', input.categoria_declaracao);
      formData.append(
        'titulo',
        input.titulo?.trim() ||
          CATEGORIA_DECLARACAO_LABELS[input.categoria_declaracao] ||
          'Pedido de declaração'
      );
      if (input.descricao?.trim()) {
        formData.append('descricao', input.descricao.trim());
      }
      await appendFileToFormData(formData, 'anexo', input.anexo);

      const response = await apiClient.postFormData<unknown>(
        '/api/mobile/documentos',
        formData
      );
      return this.unwrapDocumento(response);
    }

    const response = await apiClient.post<unknown>('/api/mobile/documentos', {
      aluno_id: input.aluno_id,
      tipo: 'pedido_declaracao',
      categoria_declaracao: input.categoria_declaracao,
      titulo:
        input.titulo?.trim() ||
        CATEGORIA_DECLARACAO_LABELS[input.categoria_declaracao] ||
        'Pedido de declaração',
      descricao: input.descricao?.trim() || null,
    });
    return this.unwrapDocumento(response);
  }

  async uploadAnexo(documentoId: string, file: DocumentoAnexoFile): Promise<Documento> {
    const formData = new FormData();
    await appendFileToFormData(formData, 'anexo', file);
    const response = await apiClient.postFormData<unknown>(
      `/api/mobile/documentos/${documentoId}/anexo`,
      formData
    );
    return this.unwrapDocumento(response);
  }

  private unwrapDocumento(response: unknown): Documento {
    const raw =
      response && typeof response === 'object' && 'documento' in (response as object)
        ? (response as { documento: unknown }).documento
        : response && typeof response === 'object' && 'data' in (response as object)
          ? (response as { data: unknown }).data
          : response;
    const doc = normalizeDocumento(raw);
    if (!doc.id) {
      throw new Error('Resposta inválida do servidor. Tente novamente.');
    }
    return doc;
  }
}

export const documentosService = new DocumentosService();

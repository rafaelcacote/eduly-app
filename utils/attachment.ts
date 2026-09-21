import { Alert, Linking } from 'react-native';
import { resolveMediaUrl } from '@/utils/mediaUrl';

export type AttachmentKind = 'image' | 'pdf' | 'file';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const PDF_EXT = new Set(['pdf']);

/** Nomes gerados pelo storage (hash/uuid/Str::random) não devem aparecer. */
const UUID_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Hex longo (ex.: a1b2c3d4…). */
const HEX_HASH_NAME = /^[a-f0-9]{16,}$/i;
/** Laravel hashName / Str::random — alfanumérico sem separadores. */
const RANDOM_STORAGE_NAME = /^[A-Za-z0-9]{16,}$/;
/** Hex com hífens/underscores/pontos entre blocos. */
const HEX_CHUNK_NAME = /^[a-f0-9]{8,}([-_.][a-f0-9]{4,})+$/i;

function isMachineGeneratedBaseName(base: string): boolean {
  if (!base) return true;
  if (UUID_NAME.test(base)) return true;
  if (HEX_HASH_NAME.test(base)) return true;
  if (RANDOM_STORAGE_NAME.test(base)) return true;
  if (HEX_CHUNK_NAME.test(base)) return true;
  return false;
}

function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').pop() || '';
    const clean = last.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
  } catch {
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
  }
}

export function getAttachmentKind(url?: string | null): AttachmentKind {
  if (!url) return 'file';
  const ext = extensionFromUrl(url);
  if (IMAGE_EXT.has(ext)) return 'image';
  if (PDF_EXT.has(ext)) return 'pdf';
  const lower = url.toLowerCase();
  if (lower.includes('image/') || lower.includes('/images/')) return 'image';
  if (lower.includes('application/pdf') || lower.includes('.pdf')) return 'pdf';
  return 'file';
}

export function getAttachmentLabel(kind: AttachmentKind): string {
  if (kind === 'image') return 'Imagem';
  if (kind === 'pdf') return 'Documento';
  return 'Anexo';
}

export function getAttachmentTitle(kind: AttachmentKind): string {
  if (kind === 'image') return 'Imagem anexada';
  if (kind === 'pdf') return 'Documento PDF';
  return 'Arquivo anexado';
}

export function getAttachmentHint(kind: AttachmentKind): string {
  if (kind === 'image') return 'Toque para ampliar';
  if (kind === 'pdf') return 'Toque para abrir';
  return 'Toque para abrir';
}

/**
 * Só usa o nome do arquivo se parecer um nome humano.
 * Hashes do Laravel storage (hashName / Str::random / uuid) são ignorados.
 */
export function getAttachmentFileName(url?: string | null): string | null {
  if (!url) return null;

  const extractName = (raw: string): string | null => {
    const clean = decodeURIComponent(raw.split('?')[0].split('#')[0]);
    if (!clean || !clean.includes('.')) return null;
    const base = clean.replace(/\.[^.]+$/, '');
    if (isMachineGeneratedBaseName(base)) return null;
    return clean;
  };

  try {
    const pathname = new URL(url).pathname;
    return extractName(pathname.split('/').pop() || '');
  } catch {
    return extractName(url.split('/').pop() || '');
  }
}

export async function openAttachment(url?: string | null): Promise<void> {
  const resolved = resolveMediaUrl(url);
  if (!resolved) {
    Alert.alert('Anexo', 'Não foi possível abrir este anexo.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(resolved);
    if (!canOpen) {
      Alert.alert('Anexo', 'Não foi possível abrir este anexo no aparelho.');
      return;
    }
    await Linking.openURL(resolved);
  } catch {
    Alert.alert('Anexo', 'Não foi possível abrir este anexo.');
  }
}

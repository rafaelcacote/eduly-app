import { API_CONFIG } from '@/config/api';

/**
 * Resolve URLs de foto/arquivo vindas da API para funcionar no dispositivo físico.
 *
 * Em Laravel local as fotos costumam ser gravadas com APP_URL (localhost ou IP antigo).
 * No celular, localhost aponta para o aparelho — então reescrevemos para EXPO_PUBLIC_API_URL.
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');

  // Path relativo
  if (!/^https?:\/\//i.test(trimmed)) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname || '';
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local');

    const isPrivateLan =
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

    const isStoragePath = pathname.includes('/storage/');

    // Fotos do backend: sempre servir pela base atual do app em ambiente local.
    if (isLocalHost || (isPrivateLan && isStoragePath)) {
      const baseUrl = new URL(base);
      parsed.protocol = baseUrl.protocol;
      parsed.host = baseUrl.host;
      return parsed.toString();
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

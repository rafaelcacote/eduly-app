import { resolveMediaUrl } from '@/utils/mediaUrl';

/** Professor / pessoa que criou recado ou comunicado */
export type MessageAuthor = {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
  foto_url: string | null;
};

export function getAuthorPhotoUrl(
  author?: Pick<MessageAuthor, 'avatar_url' | 'foto_url'> | null
): string | null {
  if (!author) return null;
  return resolveMediaUrl(author.foto_url || author.avatar_url || null);
}

export function getAuthorFirstName(nome?: string | null): string {
  if (!nome?.trim()) return 'Escola';
  return nome.trim().split(/\s+/)[0];
}

export const AUTHOR_ROLE_LABEL = 'Professor(a)';
export const AUTHOR_FALLBACK_NAME = 'Equipe da escola';

/** Título amigável para recados enviados por professores. */
export function getRecadoDaProfLabel(nome?: string | null): string {
  const name = nome?.trim() || AUTHOR_FALLBACK_NAME;
  return `Recado da Prof. ${name}`;
}

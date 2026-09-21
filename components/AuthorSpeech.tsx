import { StudentAvatar } from '@/components/StudentAvatar';
import { Colors } from '@/constants/colors';
import {
  AUTHOR_FALLBACK_NAME,
  AUTHOR_ROLE_LABEL,
  getAuthorFirstName,
  getAuthorPhotoUrl,
  getRecadoDaProfLabel,
  type MessageAuthor,
} from '@/services/authors';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Tone = 'recado' | 'comunicado';

const TONE = {
  recado: {
    accent: Colors.primary,
    border: '#dbeafe',
  },
  comunicado: {
    accent: '#0f766e',
    border: '#99f6e4',
  },
} as const;

type AuthorRowProps = {
  author?: MessageAuthor | null;
  tone?: Tone;
  /** Compact for list cards */
  compact?: boolean;
  style?: ViewStyle;
  /**
   * When true (default for recado), shows "Recado da Prof. {nome}" as the main line.
   * Pass false to keep name + role (e.g. teacher viewing the list).
   */
  asRecadoDaProf?: boolean;
};

/**
 * Compact author strip for list cards — photo + who is speaking.
 */
export function AuthorRow({
  author,
  tone = 'recado',
  compact = true,
  style,
  asRecadoDaProf = tone === 'recado',
}: AuthorRowProps) {
  const name = author?.nome_completo || AUTHOR_FALLBACK_NAME;
  const accent = TONE[tone].accent;
  const showRecadoLabel = tone === 'recado' && asRecadoDaProf;

  return (
    <View style={[styles.row, style]}>
      <StudentAvatar
        nome={name}
        fotoUrl={getAuthorPhotoUrl(author)}
        size={compact ? 'sm' : 'md'}
        ring={false}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: Colors.text }]} numberOfLines={2}>
          {showRecadoLabel ? getRecadoDaProfLabel(name) : name}
        </Text>
        {!showRecadoLabel ? (
          <Text style={[styles.rowRole, { color: accent }]} numberOfLines={1}>
            {tone === 'comunicado' ? 'Comunicado' : AUTHOR_ROLE_LABEL}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type AuthorSpeechProps = {
  author?: MessageAuthor | null;
  tone?: Tone;
  title: string;
  body: string;
  meta?: ReactNode;
  footer?: ReactNode;
};

/**
 * Detail layout: teacher speaking to the parent (avatar + speech bubble).
 */
export function AuthorSpeechCard({
  author,
  tone = 'recado',
  title,
  body,
  meta,
  footer,
}: AuthorSpeechProps) {
  const name = author?.nome_completo || AUTHOR_FALLBACK_NAME;
  const firstName = getAuthorFirstName(name);
  const isComunicado = tone === 'comunicado';
  const accent = TONE[tone].accent;
  const border = TONE[tone].border;

  return (
    <View style={styles.speechWrap}>
      <View style={styles.speechAuthor}>
        <StudentAvatar nome={name} fotoUrl={getAuthorPhotoUrl(author)} size="lg" />
        <View style={styles.speechAuthorText}>
          <Text style={styles.speechEyebrow}>
            {isComunicado ? 'Comunicado da escola' : 'Recado'}
          </Text>
          <Text style={styles.speechName} numberOfLines={2}>
            {isComunicado ? name : getRecadoDaProfLabel(name)}
          </Text>
          {isComunicado ? (
            <Text style={[styles.speechRole, { color: accent }]}>{AUTHOR_ROLE_LABEL}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.speechTailRow}>
        <View style={styles.speechTail} />
      </View>

      <View
        style={[
          styles.speechBubble,
          {
            borderColor: border,
            borderLeftColor: accent,
          },
        ]}
      >
        <Text style={styles.speechIntro}>
          {firstName} {isComunicado ? 'publicou:' : 'escreveu:'}
        </Text>
        <Text style={styles.speechTitle}>{title}</Text>
        <Text style={styles.speechBody}>{body}</Text>
        {meta ? <View style={styles.speechMeta}>{meta}</View> : null}
        {footer ? <View style={styles.speechFooter}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowRole: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  speechWrap: {
    gap: 0,
  },
  speechAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  speechAuthorText: {
    flex: 1,
    minWidth: 0,
  },
  speechEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  speechName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  speechRole: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  speechTailRow: {
    paddingLeft: 28,
    zIndex: 1,
  },
  speechTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.white,
    marginBottom: -1,
  },
  speechBubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    shadowColor: '#0b1f52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  speechIntro: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  speechTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
    lineHeight: 26,
  },
  speechBody: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text,
  },
  speechMeta: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  speechFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

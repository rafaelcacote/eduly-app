import { Colors } from '@/constants/colors';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type StudentAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
  /** Soft ring around the avatar (nice in headers) */
  ring?: boolean;
};

const SIZE_MAP: Record<AvatarSize, { box: number; font: number; ring: number }> = {
  sm: { box: 32, font: 12, ring: 2 },
  md: { box: 40, font: 14, ring: 2.5 },
  lg: { box: 56, font: 20, ring: 3 },
  xl: { box: 88, font: 28, ring: 3.5 },
};

const PALETTE = [
  { bg: '#dbeafe', fg: '#1e40af' }, // blue
  { bg: '#e0e7ff', fg: '#4338ca' }, // indigo
  { bg: '#ccfbf1', fg: '#0f766e' }, // teal
  { bg: '#fce7f3', fg: '#be185d' }, // pink
  { bg: '#ffedd5', fg: '#c2410c' }, // orange
  { bg: '#dcfce7', fg: '#15803d' }, // green
  { bg: '#f3e8ff', fg: '#7e22ce' }, // purple
  { bg: '#e0f2fe', fg: '#0369a1' }, // sky
];

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function toneForName(nome: string) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Compact student photo with elegant initials fallback.
 */
export function StudentAvatar({
  nome,
  fotoUrl,
  size = 'md',
  style,
  ring = true,
}: StudentAvatarProps) {
  const [failed, setFailed] = useState(false);
  const dims = SIZE_MAP[size];
  const initials = useMemo(() => getInitials(nome), [nome]);
  const tone = useMemo(() => toneForName(nome || 'Aluno'), [nome]);
  const resolvedUrl = useMemo(() => resolveMediaUrl(fotoUrl), [fotoUrl]);
  const showPhoto = Boolean(resolvedUrl) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  const avatar = (
    <View
      style={[
        styles.avatar,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.box / 2,
          backgroundColor: showPhoto ? Colors.muted : tone.bg,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Foto de ${nome}`}
    >
      {showPhoto ? (
        <Image
          source={{ uri: resolvedUrl! }}
          style={{ width: dims.box, height: dims.box, borderRadius: dims.box / 2 }}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: dims.font, color: tone.fg }]}>{initials}</Text>
      )}
    </View>
  );

  if (!ring) {
    return <View style={style}>{avatar}</View>;
  }

  return (
    <View
      style={[
        styles.ring,
        {
          padding: dims.ring,
          borderRadius: (dims.box + dims.ring * 2) / 2,
        },
        style,
      ]}
    >
      {avatar}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary + '28',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

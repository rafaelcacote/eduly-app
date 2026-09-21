import { Colors } from '@/constants/colors';
import type { MessageType } from '@/services/messages';
import {
  AlertTriangle,
  Bell,
  Info,
  Megaphone,
  OctagonAlert,
} from 'lucide-react-native';
import React, { type ComponentType } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type TypeIconKind = MessageType | 'escola';

type IconSize = 'sm' | 'md' | 'lg';

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type Tone = {
  Icon: IconComponent;
  color: string;
  background: string;
};

const TONES: Record<TypeIconKind, Tone> = {
  informativo: {
    Icon: Info,
    color: '#2563eb',
    background: '#dbeafe',
  },
  atencao: {
    Icon: AlertTriangle,
    color: '#d97706',
    background: '#fef3c7',
  },
  aviso: {
    Icon: OctagonAlert,
    color: '#dc2626',
    background: '#fee2e2',
  },
  lembrete: {
    Icon: Bell,
    color: Colors.secondary,
    background: '#e0e7ff',
  },
  outro: {
    Icon: Info,
    color: Colors.textSecondary,
    background: Colors.muted,
  },
  escola: {
    Icon: Megaphone,
    color: '#0f766e',
    background: '#ccfbf1',
  },
};

const SIZE_MAP: Record<IconSize, { box: number; icon: number; radius: number }> = {
  sm: { box: 40, icon: 18, radius: 12 },
  md: { box: 48, icon: 22, radius: 14 },
  lg: { box: 56, icon: 26, radius: 16 },
};

const AVISO_PRIORITY_TONES: Record<string, Pick<Tone, 'color' | 'background'>> = {
  alta: { color: '#dc2626', background: '#fee2e2' },
  normal: { color: '#0f766e', background: '#ccfbf1' },
  baixa: { color: Colors.textMuted, background: Colors.muted },
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  informativo: 'Informativo',
  atencao: 'Atenção',
  aviso: 'Alerta',
  lembrete: 'Lembrete',
  outro: 'Mensagem',
};

type TypeIconProps = {
  kind: TypeIconKind;
  size?: IconSize;
  /** For school comunicados: tint by priority */
  prioridade?: string;
  style?: ViewStyle;
};

/**
 * Soft badge icon for recado types and school comunicados.
 */
export function TypeIcon({ kind, size = 'sm', prioridade, style }: TypeIconProps) {
  const base = TONES[kind] ?? TONES.informativo;
  const dims = SIZE_MAP[size];
  const priorityTone =
    kind === 'escola' && prioridade ? AVISO_PRIORITY_TONES[prioridade] : undefined;

  const color = priorityTone?.color ?? base.color;
  const background = priorityTone?.background ?? base.background;
  const Icon = base.Icon;

  return (
    <View
      style={[
        styles.badge,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          backgroundColor: background,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={kind === 'escola' ? 'Comunicado da escola' : MESSAGE_TYPE_LABELS[kind]}
    >
      <Icon size={dims.icon} color={color} strokeWidth={2.25} />
    </View>
  );
}

export function getMessageTypeTone(tipo: MessageType): Tone {
  return TONES[tipo] ?? TONES.informativo;
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

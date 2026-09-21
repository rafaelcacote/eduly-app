import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export const HEADER_GRADIENT = ['#12358f', '#3155c6'] as [string, string];

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  /** Show back button (default true) */
  showBack?: boolean;
  onBack?: () => void;
  /** Right-side action (icon button, etc.) */
  right?: ReactNode;
  /** Extra content below the title row (e.g. student switcher) */
  children?: ReactNode;
};

/**
 * Secondary screen header — same brand language as home,
 * lighter than the home hub (no logo / no student card).
 */
export function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  children,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <LinearGradient
      colors={HEADER_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, children ? styles.headerWithChildren : null]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.sideButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={20} color={Colors.white} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {right ? <View style={styles.sideSlot}>{right}</View> : <View style={styles.sideSlot} />}
      </View>

      {children}
    </LinearGradient>
  );
}

/** Compact icon button for AppHeader right actions */
export function AppHeaderAction({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.sideButton}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headerWithChildren: {
    paddingBottom: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  sideSlot: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
  },
});

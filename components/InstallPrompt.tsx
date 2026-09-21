import { useEffect, useState } from 'react';
import {
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';

const DISMISS_KEY = 'eduly-install-dismissed-at';
const DISMISS_DAYS = 7;
const MOBILE_MAX_WIDTH = 768;

const PLAY_STORE_URL = process.env.EXPO_PUBLIC_PLAY_STORE_URL?.trim() || '';
const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL?.trim() || '';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isWebMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const narrowScreen = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return mobileUa || (narrowScreen && coarsePointer);
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se reporta como Macintosh, mas tem touch
  const iPadOs =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOs;
}

function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  const ms = DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt < ms;
}

function markDismissed() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }
}

export function InstallPrompt() {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isAlreadyInstalled()) return;
    if (!isWebMobile()) return;
    if (wasDismissedRecently()) return;

    setIsIOS(isIosDevice());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Mostra instruções mesmo sem o evento nativo (iOS / alguns Android)
    const timer = setTimeout(() => setVisible(true), 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  // Esconde se redimensionar para desktop
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (width > MOBILE_MAX_WIDTH && !isWebMobile()) {
      setVisible(false);
    }
  }, [width]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // usuário cancelou ou browser bloqueou
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
      markDismissed();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    markDismissed();
  };

  const openStore = (url: string) => {
    if (!url) return;
    Linking.openURL(url);
  };

  if (!visible || Platform.OS !== 'web') return null;

  const showPlayStore = Boolean(PLAY_STORE_URL);
  const showAppStore = Boolean(APP_STORE_URL) && isIOS;
  const showNativeInstall = Boolean(deferredPrompt) && !isIOS;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.banner} accessibilityRole="alert">
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Instale o Eduly no celular</Text>
            <Text style={styles.subtitle}>Acesso rápido, como um aplicativo</Text>
          </View>
          <Pressable
            onPress={handleDismiss}
            style={styles.closeBtn}
            accessibilityLabel="Fechar aviso de instalação"
            hitSlop={8}
          >
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
        </View>

        {isIOS ? (
          <Text style={styles.text}>
            No Safari, toque em <Text style={styles.bold}>Compartilhar</Text> e depois em{' '}
            <Text style={styles.bold}>Adicionar à Tela de Início</Text>.
          </Text>
        ) : showNativeInstall ? (
          <Text style={styles.text}>
            Instale o Eduly na tela inicial para abrir mais rápido, sem digitar o endereço.
          </Text>
        ) : (
          <Text style={styles.text}>
            No Chrome, toque em <Text style={styles.bold}>⋮</Text> e escolha{' '}
            <Text style={styles.bold}>Instalar app</Text> ou{' '}
            <Text style={styles.bold}>Adicionar à tela inicial</Text>.
          </Text>
        )}

        <View style={styles.buttons}>
          {showNativeInstall && (
            <Pressable style={styles.primaryBtn} onPress={handleInstall}>
              <Text style={styles.primaryBtnText}>Instalar agora</Text>
            </Pressable>
          )}

          {showPlayStore && !isIOS && (
            <Pressable style={styles.secondaryBtn} onPress={() => openStore(PLAY_STORE_URL)}>
              <Text style={styles.secondaryBtnText}>Abrir na Play Store</Text>
            </Pressable>
          )}

          {showAppStore && (
            <Pressable style={styles.secondaryBtn} onPress={() => openStore(APP_STORE_URL)}>
              <Text style={styles.secondaryBtnText}>Abrir na App Store</Text>
            </Pressable>
          )}

          <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissBtnText}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '500',
  },
  text: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  bold: {
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#1e40af',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  dismissBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
});

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

type EdulyWindow = Window & {
  __edulyDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
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

function readDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return (window as EdulyWindow).__edulyDeferredInstallPrompt ?? null;
}

function clearDeferredPrompt() {
  if (typeof window === 'undefined') return;
  (window as EdulyWindow).__edulyDeferredInstallPrompt = null;
}

export function InstallPrompt() {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isAlreadyInstalled()) return;
    if (!isWebMobile()) return;
    if (wasDismissedRecently()) return;

    setIsIOS(isIosDevice());

    const adoptPrompt = (event?: BeforeInstallPromptEvent | null) => {
      const promptEvent = event ?? readDeferredPrompt();
      if (!promptEvent) return;
      setDeferredPrompt(promptEvent);
      setVisible(true);
    };

    // Evento pode ter chegado antes do React montar (script em +html.tsx)
    adoptPrompt();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      (window as EdulyWindow).__edulyDeferredInstallPrompt = promptEvent;
      adoptPrompt(promptEvent);
    };

    const onInstallReady = () => adoptPrompt();

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('eduly-install-ready', onInstallReady);

    // Fallback: mostra instruções manuais se o evento nativo não vier
    const timer = setTimeout(() => setVisible(true), 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('eduly-install-ready', onInstallReady);
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
    // Android/Chrome: abre o diálogo nativo de instalação
    if (deferredPrompt && !isIOS) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // usuário cancelou ou browser bloqueou
      } finally {
        clearDeferredPrompt();
        setDeferredPrompt(null);
        setVisible(false);
        markDismissed();
      }
      return;
    }

    // iOS: Safari não permite instalar por código — mostra o passo a passo
    setShowIosGuide(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setShowIosGuide(false);
    markDismissed();
  };

  const openStore = (url: string) => {
    if (!url) return;
    Linking.openURL(url);
  };

  if (!visible || Platform.OS !== 'web') return null;

  const showPlayStore = Boolean(PLAY_STORE_URL);
  const showAppStore = Boolean(APP_STORE_URL) && isIOS;
  const canNativeInstall = Boolean(deferredPrompt) && !isIOS;
  // Sempre mostra "Instalar" no iOS (guia) e no Android quando o prompt nativo existir
  const showInstallButton = isIOS || canNativeInstall;

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
          showIosGuide ? (
            <View style={styles.guide}>
              <Text style={styles.guideTitle}>Como instalar no iPhone</Text>
              <View style={styles.guideStep}>
                <Text style={styles.guideNum}>1</Text>
                <Text style={styles.guideText}>
                  Toque no botão <Text style={styles.bold}>Compartilhar</Text> (□↑) na barra do
                  Safari, embaixo da tela.
                </Text>
              </View>
              <View style={styles.guideStep}>
                <Text style={styles.guideNum}>2</Text>
                <Text style={styles.guideText}>
                  Role e toque em <Text style={styles.bold}>Adicionar à Tela de Início</Text>.
                </Text>
              </View>
              <View style={styles.guideStep}>
                <Text style={styles.guideNum}>3</Text>
                <Text style={styles.guideText}>
                  Confirme em <Text style={styles.bold}>Adicionar</Text>. O ícone do Eduly
                  aparece na tela inicial.
                </Text>
              </View>
              <Text style={styles.guideHint}>
                Se estiver no Chrome ou outro navegador, abra este site no Safari para instalar.
              </Text>
            </View>
          ) : (
            <Text style={styles.text}>
              No iPhone, toque em <Text style={styles.bold}>Instalar</Text> para ver como
              adicionar o Eduly à tela inicial.
            </Text>
          )
        ) : canNativeInstall ? (
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
          {showInstallButton && !showIosGuide && (
            <Pressable
              style={styles.primaryBtn}
              onPress={handleInstall}
              accessibilityLabel="Instalar o Eduly"
            >
              <Text style={styles.primaryBtnText}>Instalar</Text>
            </Pressable>
          )}

          {showIosGuide && (
            <Pressable
              style={styles.primaryBtn}
              onPress={handleDismiss}
              accessibilityLabel="Entendi, fechar"
            >
              <Text style={styles.primaryBtnText}>Entendi</Text>
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

          {!showIosGuide && (
            <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissBtnText}>Agora não</Text>
            </Pressable>
          )}
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
  guide: {
    marginBottom: 14,
    gap: 10,
  },
  guideTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  guideText: {
    flex: 1,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 21,
  },
  guideHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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

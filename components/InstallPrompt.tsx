import { useEffect, useState } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';

const DISMISS_KEY = 'eduly-install-dismissed';

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<{ outcome: string }>;
  } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) return;

    const dismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints > 1;
    setIsIOS(ios);

    if (ios) {
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> });
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setShowBanner(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        setShowBanner(false);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(DISMISS_KEY, Date.now().toString());
        }
      } catch {
        setShowBanner(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
  };

  if (!showBanner || Platform.OS !== 'web') return null;

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.title}>Instalar Eduly</Text>
        {isIOS ? (
          <Text style={styles.text}>
            Toque em <Text style={styles.bold}>Compartilhar</Text> (ícone de seta) e depois em{' '}
            <Text style={styles.bold}>Adicionar à Tela de Início</Text>
          </Text>
        ) : deferredPrompt ? (
          <Text style={styles.text}>Adicione o app à sua tela inicial para acesso rápido</Text>
        ) : (
          <Text style={styles.text}>
            Toque no menu <Text style={styles.bold}>⋮</Text> e selecione{' '}
            <Text style={styles.bold}>Instalar app</Text> ou <Text style={styles.bold}>Adicionar à tela inicial</Text>
          </Text>
        )}
        <View style={styles.buttons}>
          {!isIOS && (
            <Pressable style={styles.installBtn} onPress={handleInstall}>
              <Text style={styles.installBtnText}>Instalar</Text>
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
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e40af',
    padding: 16,
    paddingBottom: 24,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  text: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  installBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  installBtnText: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dismissBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
});

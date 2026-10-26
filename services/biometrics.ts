import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

const BIOMETRIC_KEY = '@eduly:biometric_enabled';

const PROMPT_MESSAGE = 'Confirme sua identidade para entrar no Eduly';
const PROMPT_DESCRIPTION = 'Use a digital, o reconhecimento facial ou a senha do celular.';

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(BIOMETRIC_KEY, '1');
    return;
  }
  await AsyncStorage.removeItem(BIOMETRIC_KEY);
}

/** Celular com digital, rosto ou senha/PIN/padrão cadastrados. Não existe na web. */
export async function canUseDeviceLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: PROMPT_MESSAGE,
      promptDescription: PROMPT_DESCRIPTION,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha do celular',
      disableDeviceFallback: false,
      requireConfirmation: false,
      biometricsSecurityLevel: 'weak',
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Pergunta uma vez, depois do login com CPF e senha, se as próximas
 * aberturas podem usar a biometria ou a senha do celular.
 */
export async function promptToEnableBiometrics(): Promise<void> {
  if (await isBiometricEnabled()) return;
  if (!(await canUseDeviceLock())) return;

  await new Promise<void>((resolve) => {
    Alert.alert(
      'Entrar mais rápido',
      'Na próxima vez, deseja abrir o Eduly com a digital, o reconhecimento facial ou a senha do celular?',
      [
        {
          text: 'Não, usar a senha do app',
          style: 'cancel',
          onPress: () => resolve(),
        },
        {
          text: 'Sim',
          onPress: () => {
            setBiometricEnabled(true)
              .catch(() => undefined)
              .finally(() => resolve());
          },
        },
      ],
      { cancelable: false }
    );
  });
}

/**
 * Configuração da API
 *
 * BASE_URL = host sem /api/mobile (os endpoints já incluem esse prefixo).
 * PWA (m.agendaedully.com.br) e APK (EAS): https://app.agendaedully.com.br
 * Homologação: https://homolog.agendaedully.com.br
 * Local:       http://192.168.x.x:8000
 *
 * PWA e APK (EAS) usam EXPO_PUBLIC_API_URL no build.
 */
export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://app.agendaedully.com.br',
    TIMEOUT: 30000, // 30 segundos
};

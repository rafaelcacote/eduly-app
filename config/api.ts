/**
 * Configuração da API
 * 
 * ATENÇÃO: Altere a URL_BASE para a URL do seu servidor Laravel
 * Exemplo: 'http://192.168.1.100:8000' para desenvolvimento local
 * ou 'https://api.seudominio.com' para produção
 */
export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000',
    TIMEOUT: 30000, // 30 segundos
};

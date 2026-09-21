/**
 * Dados da Marca Eduly
 * 
 * Este arquivo contém todas as informações sobre a identidade visual
 * e elementos de marca do aplicativo Eduly.
 */

export const BrandData = {
  // Informações básicas da marca
  name: 'Eduly',
  tagline: 'Agenda Escolar',
  description: 'Plataforma completa para gestão escolar, conectando professores, alunos e responsáveis.',
  fullName: 'Eduly - Agenda Escolar',

  // Cores da marca (baseadas no design do app)
  colors: {
    primary: '#1e40af', // blue-700
    secondary: '#6366f1', // indigo-500
    background: '#f0f9ff', // blue-50
    backgroundSecondary: '#eef2ff', // indigo-50
    white: '#ffffff',
    text: '#1f2937', // gray-800
    textSecondary: '#6b7280', // gray-500
    textMuted: '#9ca3af', // gray-400
    border: '#e5e7eb', // gray-200
    success: '#10b981', // green-500
    warning: '#f59e0b', // yellow-500
    error: '#ef4444', // red-500
    gradient: {
      primary: ['#1e40af', '#6366f1'], // from-primary to-secondary
      success: ['#10b981', '#059669'],
      blue: ['#3b82f6', '#2563eb'],
    },
  },

  // Tipografia
  typography: {
    fontFamily: {
      sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      serif: "Georgia, 'Times New Roman', serif",
      mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
      '5xl': '36px',
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Assets
  assets: {
    logo: {
      login: '@/assets/images/eduly_logo_login.png',
      main: '@/assets/images/eduly_logo.png',
      icon: '@/assets/icon.png',
    },
  },

  // Valores e missão
  mission: 'Simplificar a comunicação e gestão escolar, tornando a educação mais acessível e eficiente.',
  vision: 'Ser a plataforma líder em gestão escolar no Brasil.',
  values: [
    'Inovação',
    'Acessibilidade',
    'Transparência',
    'Eficiência',
    'Comunicação',
  ],

  // Recursos principais
  features: [
    {
      title: 'Recados e Comunicados',
      description: 'Recados direcionados e comunicados para toda a escola',
      icon: 'Mail',
    },
    {
      title: 'Exercícios',
      description: 'Criação e acompanhamento de exercícios escolares',
      icon: 'BookOpen',
    },
    {
      title: 'Provas',
      description: 'Gestão completa de provas e avaliações',
      icon: 'ClipboardList',
    },
    {
      title: 'Dashboard',
      description: 'Visão geral de todas as atividades escolares',
      icon: 'GraduationCap',
    },
  ],

  // Informações de contato (exemplo)
  contact: {
    website: 'https://edully.cassote.com',
    email: 'contato@eduly.com',
    support: 'suporte@eduly.com',
  },
};

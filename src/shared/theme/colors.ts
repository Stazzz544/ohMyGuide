// Токены цветов для светлой и тёмной тем

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  // Основные
  primary: string;
  primaryHover: string;
  // Текст
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  // Фоны
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  // Статусные
  success: string;
  danger: string;
  warning: string;
  info: string;
  // Границы
  border: string;
  // Skeleton
  skeleton: string;
  skeletonHighlight: string;
  // Навигация
  tabBarBg: string;
  headerBg: string;
  // Инпуты
  inputBg: string;
  inputBorder: string;
  placeholder: string;
};

export const lightColors: ThemeColors = {
  primary: '#3748c6',
  primaryHover: '#2a3899',
  textPrimary: '#040134',
  textSecondary: '#545465',
  textInverse: '#ffffff',
  bgPrimary: '#ffffff',
  bgSecondary: '#f4f4f7',
  bgCard: '#ffffff',
  success: '#2cbea0',
  danger: '#ed6f78',
  warning: '#f8d154',
  info: '#3748c6',
  border: '#d9d9e1',
  skeleton: '#e1e1e8',
  skeletonHighlight: '#f4f4f7',
  tabBarBg: '#ffffff',
  headerBg: '#ffffff',
  inputBg: '#f4f4f7',
  inputBorder: '#d9d9e1',
  placeholder: '#a0a0b0',
};

export const darkColors: ThemeColors = {
  primary: '#5b6bd6',
  primaryHover: '#7b88e0',
  textPrimary: '#f0f0f7',
  textSecondary: '#a0a0b0',
  textInverse: '#040134',
  bgPrimary: '#0d0d1a',
  bgSecondary: '#1a1a2e',
  bgCard: '#1a1a2e',
  success: '#3dd4b4',
  danger: '#ff8a92',
  warning: '#ffd96a',
  info: '#5b6bd6',
  border: '#2a2a40',
  skeleton: '#2a2a40',
  skeletonHighlight: '#3a3a55',
  tabBarBg: '#0d0d1a',
  headerBg: '#0d0d1a',
  inputBg: '#1a1a2e',
  inputBorder: '#2a2a40',
  placeholder: '#6a6a80',
};

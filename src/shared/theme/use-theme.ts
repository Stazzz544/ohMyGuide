import { useContext } from 'react';
import { ThemeContext, ThemeContextValue } from './theme-context';

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  return context;
};

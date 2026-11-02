import { safeStorage } from './safeStorage';

export type AppTheme = 'dark' | 'light';

export const getStoredTheme = (): AppTheme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = safeStorage.getItem('tb_theme');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark'; // Dark mode is default
};

export const applyTheme = (theme: AppTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (theme === 'light') {
    root.classList.add('theme-light');
    root.classList.remove('theme-dark');
    root.setAttribute('data-theme', 'light');
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  } else {
    root.classList.add('theme-dark');
    root.classList.remove('theme-light');
    root.setAttribute('data-theme', 'dark');
    document.body.style.backgroundColor = '#0c0a09';
    document.body.style.color = '#f5f5f4';
  }
  
  safeStorage.setItem('tb_theme', theme);
};

export const toggleTheme = (currentTheme: AppTheme): AppTheme => {
  const nextTheme: AppTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  return nextTheme;
};

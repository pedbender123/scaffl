import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  themeMode: 'light' | 'dark';
  accentColor: string;
  setThemeMode: (mode: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ACCENT_COLORS = {
  cyberSky: '#38bdf8', // Cyber Sky (Acento de IA)
  quantumGreen: '#10b981', // Quantum Green (Acento de Ciência)
  auraViolet: '#a78bfa', // Aura Violet (Acento de Insight)
  white: '#ffffff',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { userData, updateUserData } = useAuth();

  // Estados locais para quando o usuário não está logado
  const [localThemeMode, setLocalThemeMode] = useState<'light' | 'dark'>(() => {
    const val = localStorage.getItem('tutorai_temp_theme');
    return (val === 'light' || val === 'dark') ? val : 'dark';
  });
  const [localAccentColor, setLocalAccentColor] = useState<string>(() => {
    return localStorage.getItem('tutorai_temp_accent') || 'cyberSky';
  });

  const themeMode = userData ? userData.themeMode : localThemeMode;
  const accentColor = userData ? userData.accentColor : localAccentColor;

  // Sincroniza as configurações temporárias para as configs reais do usuário após logar
  useEffect(() => {
    if (userData) {
      const tempTheme = localStorage.getItem('tutorai_temp_theme') as 'light' | 'dark' | null;
      const tempAccent = localStorage.getItem('tutorai_temp_accent');

      if (tempTheme || tempAccent) {
        updateUserData({
          themeMode: tempTheme || userData.themeMode,
          accentColor: (tempAccent || userData.accentColor) as any
        }).then(() => {
          localStorage.removeItem('tutorai_temp_theme');
          localStorage.removeItem('tutorai_temp_accent');
        }).catch(err => {
          console.error('Falha ao exportar tema temporário para as configs do usuário:', err);
        });
      }
    }
  }, [userData, updateUserData]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Configura o tema dark/light
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Configura a cor de destaque
    const hexColor = ACCENT_COLORS[accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.cyberSky;
    root.style.setProperty('--color-primary', hexColor);
    
    // Lida com o contraste do acento branco
    if (accentColor === 'white' && themeMode === 'light') {
      root.style.setProperty('--color-primary', '#000000');
      root.style.setProperty('--color-primary-foreground', '#ffffff');
    } else if (accentColor === 'white' && themeMode === 'dark') {
      root.style.setProperty('--color-primary', '#ffffff');
      root.style.setProperty('--color-primary-foreground', '#000000');
    } else {
      root.style.setProperty('--color-primary-foreground', '#ffffff');
    }

  }, [themeMode, accentColor]);

  const setThemeMode = (mode: 'light' | 'dark') => {
    if (userData) {
      updateUserData({ themeMode: mode });
    } else {
      localStorage.setItem('tutorai_temp_theme', mode);
      setLocalThemeMode(mode);
    }
  };

  const setAccentColor = (color: string) => {
    if (userData) {
      updateUserData({ accentColor: color as any });
    } else {
      localStorage.setItem('tutorai_temp_accent', color);
      setLocalAccentColor(color);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, accentColor, setThemeMode, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

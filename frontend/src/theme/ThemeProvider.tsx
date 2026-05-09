import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { THEMED_SCROLLBAR_CLASS } from './themedScrollbar';

/** Manual de marca · Light: primario #1F3D2B · secundario #F3F0E6 · Dark: primario #C8A14B · secundario #121911 */

export type ThemeMode = 'light' | 'dark' | 'hybrid';
type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'themeMode';

export type Palette = {
  background: string;
  text: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarBorder: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  /** Selects/combobox: panel elevado sobre el fondo (mejor lectura que card semitransparente) */
  menuSurface: string;
  menuBorder: string;
  menuItemHoverBg: string;
  menuItemSelectedBg: string;
  primary: string;
  primaryText: string;
  mutedText: string;
  dangerBg: string;
  dangerText: string;
  warningBg: string;
  warningText: string;
  warningBorder: string;
};

const LIGHT_PRIMARY = '#1F3D2B';
const LIGHT_SECONDARY = '#F3F0E6';

const DARK_PRIMARY = '#C8A14B';
const DARK_SECONDARY = '#121911';

/** Legibilidad en superficies claras / oscuras */
const IVORY = LIGHT_SECONDARY;
const SAND = '#D7CAB1';
const WINE = '#591E2A';

const PALETTES: Record<ThemeMode, Palette> = {
  light: {
    background: LIGHT_SECONDARY,
    text: LIGHT_PRIMARY,
    sidebarBg: '#FFFFFF',
    sidebarText: LIGHT_PRIMARY,
    sidebarBorder: 'rgba(31,61,43,0.12)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(31,61,43,0.12)',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(31,61,43,0.22)',
    menuSurface: '#FFFFFF',
    menuBorder: 'rgba(31,61,43,0.18)',
    menuItemHoverBg: 'rgba(31,61,43,0.07)',
    menuItemSelectedBg: 'rgba(31,61,43,0.11)',
    primary: LIGHT_PRIMARY,
    primaryText: LIGHT_SECONDARY,
    mutedText: 'rgba(31, 61, 43, 0.62)',
    dangerBg: 'rgba(239, 68, 68, 0.10)',
    dangerText: WINE,
    warningBg: 'rgba(230, 11, 11, 0.18)',
    warningText: 'rgb(246, 85, 85)',
    warningBorder: 'rgb(252, 165, 165)',
  },
  dark: {
    background: DARK_SECONDARY,
    text: IVORY,
    sidebarBg: DARK_SECONDARY,
    sidebarText: IVORY,
    sidebarBorder: 'rgba(243,240,230,0.14)',
    cardBg: '#171f14',
    cardBorder: 'rgba(243,240,230,0.12)',
    inputBg: '#1c2619',
    inputBorder: 'rgba(243,240,230,0.22)',
    menuSurface: '#1e291b',
    menuBorder: 'rgba(243,240,230,0.18)',
    menuItemHoverBg: 'rgba(200,161,75,0.14)',
    menuItemSelectedBg: 'rgba(200,161,75,0.22)',
    primary: DARK_PRIMARY,
    primaryText: DARK_SECONDARY,
    mutedText: 'rgba(243, 240, 230, 0.72)',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerText: '#FCA5A5',
    warningBg: 'rgba(230, 11, 11, 0.18)',
    warningText: 'rgb(252, 165, 165)',
    warningBorder: 'rgb(252, 165, 165)',
  },
  /** Contenido claro + barra lateral verde botella (sin bordó) */
  hybrid: {
    background: LIGHT_SECONDARY,
    text: LIGHT_PRIMARY,
    sidebarBg: LIGHT_PRIMARY,
    sidebarText: LIGHT_SECONDARY,
    sidebarBorder: 'rgba(243,240,230,0.14)',
    cardBg: '#FFFFFF',
    cardBorder: SAND,
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(31,61,43,0.18)',
    menuSurface: '#FFFFFF',
    menuBorder: 'rgba(31,61,43,0.16)',
    menuItemHoverBg: 'rgba(31,61,43,0.07)',
    menuItemSelectedBg: 'rgba(31,61,43,0.11)',
    primary: LIGHT_PRIMARY,
    primaryText: LIGHT_SECONDARY,
    mutedText: 'rgba(31, 61, 43, 0.62)',
    dangerBg: 'rgba(239, 68, 68, 0.10)',
    dangerText: '#991b1b',
    warningBg: 'rgba(230, 11, 11, 0.18)',
    warningText: 'rgb(244, 98, 98)',
    warningBorder: 'rgb(252, 165, 165)',
  },
};

function applyScrollbarCssVars(next: ThemeMode) {
  const p = PALETTES[next];
  const root = document.documentElement;
  root.setAttribute('data-theme', next);
  root.style.setProperty('--scrollbar-track', p.cardBg);
  if (next === 'dark') {
    root.style.setProperty('--scrollbar-thumb', 'rgba(200, 161, 75, 0.42)');
    root.style.setProperty('--scrollbar-thumb-hover', 'rgba(200, 161, 75, 0.72)');
    root.style.setProperty('--scrollbar-corner', p.cardBg);
  } else {
    root.style.setProperty('--scrollbar-thumb', 'rgba(31, 61, 43, 0.28)');
    root.style.setProperty('--scrollbar-thumb-hover', 'rgba(31, 61, 43, 0.5)');
    root.style.setProperty('--scrollbar-corner', p.background);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'light' || saved === 'dark' || saved === 'hybrid') return saved;
    return 'hybrid';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useLayoutEffect(() => {
    applyScrollbarCssVars(mode);
  }, [mode]);

  useEffect(() => {
    document.body.classList.add(THEMED_SCROLLBAR_CLASS);
    return () => document.body.classList.remove(THEMED_SCROLLBAR_CLASS);
  }, []);

  const setMode = (next: ThemeMode) => setModeState(next);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}

export function usePalette(): Palette {
  const { mode } = useTheme();
  return PALETTES[mode];
}

export const paletteFor = (mode: ThemeMode) => PALETTES[mode];

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { vars } from 'nativewind';
import { darkColors, lightColors, setActiveColors, type ColorPalette } from '@/src/theme/colors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type TextScale = 0.85 | 1 | 1.15 | 1.3;
export type FontChoice = 'poppins' | 'karla' | 'system';
export type PermitType = 'B' | 'B1' | 'A1, A2, A3' | 'C, C1' | 'D';
export const PERMIT_TYPES: PermitType[] = ['B', 'B1', 'A1, A2, A3', 'C, C1', 'D'];

type Preferences = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ColorPalette;
  textScale: TextScale;
  fontChoice: FontChoice;
  selectedPermitTypes: PermitType[];
  themeVariables: ReturnType<typeof vars>;
  setMode: (mode: ThemeMode) => void;
  setTextScale: (scale: TextScale) => void;
  setFontChoice: (font: FontChoice) => void;
  togglePermitType: (permitType: PermitType) => void;
};

const STORAGE_KEY = 'dh-prepa-ui-preferences-v1';
const ThemePreferencesContext = createContext<Preferences | null>(null);

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return `${parseInt(value.slice(0, 2), 16)} ${parseInt(value.slice(2, 4), 16)} ${parseInt(value.slice(4, 6), 16)}`;
}

function resolveScheme(mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

function normalizePermitTypes(value: unknown): PermitType[] {
  const stored = Array.isArray(value) ? value.filter((item): item is PermitType => PERMIT_TYPES.includes(item as PermitType)) : [];
  return PERMIT_TYPES.filter((permitType) => permitType === 'B' || stored.includes(permitType));
}

export function ThemePreferencesProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [textScale, setTextScaleState] = useState<TextScale>(1);
  const [fontChoice, setFontChoiceState] = useState<FontChoice>('poppins');
  const [selectedPermitTypes, setSelectedPermitTypesState] = useState<PermitType[]>(['B']);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { mode?: ThemeMode; textScale?: TextScale; fontChoice?: FontChoice; selectedPermitTypes?: unknown };
        if (parsed.mode === 'system' || parsed.mode === 'light' || parsed.mode === 'dark') setModeState(parsed.mode);
        if ([0.85, 1, 1.15, 1.3].includes(parsed.textScale ?? 0)) setTextScaleState(parsed.textScale!);
        if (parsed.fontChoice === 'poppins' || parsed.fontChoice === 'karla' || parsed.fontChoice === 'system') setFontChoiceState(parsed.fontChoice);
        setSelectedPermitTypesState(normalizePermitTypes(parsed.selectedPermitTypes));
      } catch { /* Conserver les valeurs par défaut si le stockage est illisible. */ }
    });
  }, []);

  const persist = useCallback((nextMode: ThemeMode, nextScale: TextScale, nextFont: FontChoice, nextPermitTypes: PermitType[]) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, textScale: nextScale, fontChoice: nextFont, selectedPermitTypes: normalizePermitTypes(nextPermitTypes) }));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist(next, textScale, fontChoice, selectedPermitTypes);
  }, [fontChoice, persist, selectedPermitTypes, textScale]);

  const setTextScale = useCallback((next: TextScale) => {
    setTextScaleState(next);
    persist(mode, next, fontChoice, selectedPermitTypes);
  }, [fontChoice, mode, persist, selectedPermitTypes]);

  const setFontChoice = useCallback((next: FontChoice) => {
    setFontChoiceState(next);
    persist(mode, textScale, next, selectedPermitTypes);
  }, [mode, persist, selectedPermitTypes, textScale]);

  const togglePermitType = useCallback((permitType: PermitType) => {
    if (permitType === 'B') return;
    setSelectedPermitTypesState((current) => {
      const next = normalizePermitTypes(current.includes(permitType) ? current.filter((item) => item !== permitType) : [...current, permitType]);
      persist(mode, textScale, fontChoice, next);
      return next;
    });
  }, [fontChoice, mode, persist, textScale]);

  const scheme = resolveScheme(mode, systemScheme);
  const colors = scheme === 'dark' ? darkColors : lightColors;
  setActiveColors(colors);
  const themeVariables = useMemo(() => vars(Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [`--color-${name}`, hexToRgb(value)]),
  )), [colors]);

  const value = useMemo(() => ({ mode, scheme, colors, textScale, fontChoice, selectedPermitTypes, themeVariables, setMode, setTextScale, setFontChoice, togglePermitType }),
    [colors, fontChoice, mode, scheme, selectedPermitTypes, setFontChoice, setMode, setTextScale, textScale, themeVariables, togglePermitType]);

  return <ThemePreferencesContext value={value}>{children}</ThemePreferencesContext>;
}

export function useThemePreferences() {
  const value = React.use(ThemePreferencesContext);
  if (!value) throw new Error('useThemePreferences doit être utilisé dans ThemePreferencesProvider');
  return value;
}

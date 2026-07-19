import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { vars } from 'nativewind';
import { darkColors, lightColors, setActiveColors, type ColorPalette } from '@/src/theme/colors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type TextScale = 0.85 | 1 | 1.15 | 1.3;
export type PermitType = 'B' | 'B1' | 'A1, A2, A3' | 'C, C1' | 'D';
export const PERMIT_TYPES: PermitType[] = ['B', 'B1', 'A1, A2, A3', 'C, C1', 'D'];

type Preferences = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ColorPalette;
  textScale: TextScale;
  selectedPermitTypes: PermitType[];
  themeVariables: ReturnType<typeof vars>;
  setMode: (mode: ThemeMode) => void;
  setTextScale: (scale: TextScale) => void;
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
  const [selectedPermitTypes, setSelectedPermitTypesState] = useState<PermitType[]>(['B']);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { mode?: ThemeMode; textScale?: TextScale; selectedPermitTypes?: unknown };
        if (parsed.mode === 'system' || parsed.mode === 'light' || parsed.mode === 'dark') setModeState(parsed.mode);
        if ([0.85, 1, 1.15, 1.3].includes(parsed.textScale ?? 0)) setTextScaleState(parsed.textScale!);
        setSelectedPermitTypesState(normalizePermitTypes(parsed.selectedPermitTypes));
      } catch { /* Conserver les valeurs par défaut si le stockage est illisible. */ }
    });
  }, []);

  const persist = useCallback((nextMode: ThemeMode, nextScale: TextScale, nextPermitTypes: PermitType[]) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, textScale: nextScale, selectedPermitTypes: normalizePermitTypes(nextPermitTypes) }));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist(next, textScale, selectedPermitTypes);
  }, [persist, selectedPermitTypes, textScale]);

  const setTextScale = useCallback((next: TextScale) => {
    setTextScaleState(next);
    persist(mode, next, selectedPermitTypes);
  }, [mode, persist, selectedPermitTypes]);

  const togglePermitType = useCallback((permitType: PermitType) => {
    if (permitType === 'B') return;
    setSelectedPermitTypesState((current) => {
      const next = normalizePermitTypes(current.includes(permitType) ? current.filter((item) => item !== permitType) : [...current, permitType]);
      persist(mode, textScale, next);
      return next;
    });
  }, [mode, persist, textScale]);

  const scheme = resolveScheme(mode, systemScheme);
  const colors = scheme === 'dark' ? darkColors : lightColors;
  setActiveColors(colors);
  const themeVariables = useMemo(() => vars(Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [`--color-${name}`, hexToRgb(value)]),
  )), [colors]);

  const value = useMemo(() => ({ mode, scheme, colors, textScale, selectedPermitTypes, themeVariables, setMode, setTextScale, togglePermitType }),
    [colors, mode, scheme, selectedPermitTypes, setMode, setTextScale, textScale, themeVariables, togglePermitType]);

  return <ThemePreferencesContext value={value}>{children}</ThemePreferencesContext>;
}

export function useThemePreferences() {
  const value = React.use(ThemePreferencesContext);
  if (!value) throw new Error('useThemePreferences doit être utilisé dans ThemePreferencesProvider');
  return value;
}

import React, { createContext, forwardRef } from 'react';
import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';
import { useThemePreferences } from '@/src/theme/preferences';

const sizes: Record<string, number> = {
  'text-[10px]': 10, 'text-[11px]': 11, 'text-xs': 12, 'text-sm': 14,
  'text-base': 16, 'text-lg': 18, 'text-xl': 20, 'text-2xl': 24,
  'text-3xl': 30, 'text-4xl': 36,
};

const lineHeights: Record<string, number> = {
  'leading-4': 16, 'leading-5': 20, 'leading-6': 24, 'leading-7': 28,
  'leading-8': 32, 'leading-tight': 36,
};

function classValue(className: string | undefined, values: Record<string, number>) {
  if (!className) return undefined;
  const tokens = className.split(/\s+/);
  const token = [...tokens].reverse().find((item) => values[item] !== undefined);
  return token ? values[token] : undefined;
}

const InheritedFontSizeContext = createContext<number | null>(null);
const InheritedFontFamilyContext = createContext<string | undefined>(undefined);

function fontFamily(inherited: string | undefined, className?: string, weight?: TextStyle['fontWeight']) {
  if (className?.match(/\bfont-(black|extrabold)\b/) || weight === '800' || weight === '900') return 'Poppins_800ExtraBold';
  if (className?.match(/\bfont-bold\b/) || weight === 'bold' || weight === '700') return 'Poppins_700Bold';
  if (className?.match(/\bfont-semibold\b/) || weight === '600') return 'Poppins_600SemiBold';
  if (className?.match(/\bfont-medium\b/) || weight === '500') return 'Poppins_500Medium';
  return inherited ?? 'Poppins_400Regular';
}

export const AppText = forwardRef<NativeText, TextProps & { className?: string }>(function AppText(
  { className, style, allowFontScaling = false, children, ...props }, ref,
) {
  const { textScale } = useThemePreferences();
  const inheritedSize = React.use(InheritedFontSizeContext);
  const inheritedFamily = React.use(InheritedFontFamilyContext);
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const classSize = classValue(className, sizes);
  const classLineHeight = classValue(className, lineHeights);
  const resolvedSize = flat?.fontSize ?? classSize ?? inheritedSize ?? 14;
  const resolvedLineHeight = flat?.lineHeight ?? classLineHeight;
  const resolvedFamily = fontFamily(inheritedFamily, className, flat?.fontWeight);

  return <InheritedFontFamilyContext value={resolvedFamily}><InheritedFontSizeContext value={resolvedSize}><NativeText
      ref={ref}
      {...props}
      allowFontScaling={allowFontScaling}
      className={className}
      style={[
        style,
        {
          fontFamily: resolvedFamily,
          fontSize: resolvedSize * textScale,
          ...(resolvedLineHeight ? { lineHeight: resolvedLineHeight * textScale } : null),
        },
      ]}
    >{children}</NativeText></InheritedFontSizeContext></InheritedFontFamilyContext>;
});

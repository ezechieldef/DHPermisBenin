// eslint-disable-next-line @typescript-eslint/no-require-imports
const palettes = require('./colors.cjs') as { lightColors: ColorPalette; darkColors: ColorPalette };

export type ColorPalette = Record<
  | 'ink' | 'inkMuted' | 'primary' | 'primaryDark' | 'primarySoft'
  | 'secondary' | 'secondarySoft' | 'danger' | 'dangerSoft'
  | 'info' | 'infoSoft' | 'background' | 'surface' | 'border'
  | 'success' | 'progressBackground' | 'progressBorder' | 'progressText'
  | 'white' | 'black',
  string
>;

export const lightColors = palettes.lightColors;
export const darkColors = palettes.darkColors;
let activeColors = lightColors;
export const colors = new Proxy({} as ColorPalette, {
  get: (_target, property: string) => activeColors[property as keyof ColorPalette],
});

export function setActiveColors(next: ColorPalette) {
  activeColors = next;
}

export type ColorToken = keyof typeof colors;

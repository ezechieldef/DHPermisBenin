export const colors = require('./colors.cjs').colors as Record<
  | 'ink' | 'inkMuted' | 'primary' | 'primaryDark' | 'primarySoft'
  | 'secondary' | 'secondarySoft' | 'danger' | 'dangerSoft'
  | 'info' | 'infoSoft' | 'background' | 'surface' | 'border'
  | 'success' | 'white' | 'black',
  string
>;

export type ColorToken = keyof typeof colors;

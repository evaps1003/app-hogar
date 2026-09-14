export interface Palette {
  id: string;
  name: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primarySoft: string;
  primaryStrong: string;
  highlight: string;
  highlightSoft: string;
  highlightStrong: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  info: string;
  infoSoft: string;
  infoStrong: string;
  warning: string;
  warningSoft: string;
  warningStrong: string;
  pillBackground: string;
  tabInactive: string;
  divider: string;
  shadow: string;
  danger: string;
}

export const PASTEL_BLOOM: Palette = {
  id: 'pastel-bloom',
  name: 'Pastel Bloom',
  background: '#FBF8FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F6F1FA',
  textPrimary: '#4A3F52',
  textSecondary: '#8A7E94',
  primary: '#E8A2AC',
  primarySoft: '#FBE5E8',
  primaryStrong: '#D77F8D',
  highlight: '#ECD49B',
  highlightSoft: '#FAF3E1',
  highlightStrong: '#D8B670',
  accent: '#A5D6C1',
  accentSoft: '#E4F2EB',
  accentStrong: '#7FBFA4',
  info: '#A9C4E8',
  infoSoft: '#E8F0FB',
  infoStrong: '#7FA4D6',
  warning: '#EBC38F',
  warningSoft: '#FBF0DF',
  warningStrong: '#DEA25C',
  pillBackground: '#F2EBF7',
  tabInactive: '#A79DAD',
  divider: '#EFE9F3',
  shadow: '#8E7C99',
  danger: '#E27D8D',
};

export const NOCHE_SERENA: Palette = {
  id: 'noche-serena',
  name: 'Noche Serena',
  background: '#1B1720',
  surface: '#26202E',
  surfaceVariant: '#2F2940',
  textPrimary: '#F2EDF6',
  textSecondary: '#A99EB5',
  primary: '#E8A2AC',
  primarySoft: '#3A2B33',
  primaryStrong: '#F0B4BD',
  highlight: '#ECD49B',
  highlightSoft: '#37301F',
  highlightStrong: '#F0DCA8',
  accent: '#9ED0BB',
  accentSoft: '#22322B',
  accentStrong: '#ABDCC7',
  info: '#9DB8DC',
  infoSoft: '#22303F',
  infoStrong: '#A9C6E8',
  warning: '#E8BE8A',
  warningSoft: '#3A2A16',
  warningStrong: '#EFC896',
  pillBackground: '#3B3347',
  tabInactive: '#8D8296',
  divider: '#3A3347',
  shadow: '#000000',
  danger: '#E58A98',
};

export const PALETTES: Palette[] = [PASTEL_BLOOM, NOCHE_SERENA];

export function getPaletteById(id: string): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PASTEL_BLOOM;
}
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  massive: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  h1: 28,
  h2: 22,
  title: 18,
  body: 15,
  label: 13,
  caption: 12,
} as const;

export function makeShadows(shadowColor: string) {
  return {
    card: {
      shadowColor,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    soft: {
      shadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    floating: {
      shadowColor,
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  } as const;
}
import { TaskCategory } from './types';

export const BUILTIN_CATEGORIES: TaskCategory[] = [
  'limpieza',
  'cocina',
  'otros',
];

export const CUSTOM_CATEGORY_ICON = 'pricetag-outline';

export const CATEGORY_LABELS: Record<string, string> = {
  limpieza: 'Limpieza',
  cocina: 'Cocina',
  otros: 'Otros',
};

export const CATEGORY_ICONS: Record<string, string> = {
  limpieza: 'sparkles-outline',
  cocina: 'restaurant-outline',
  otros: 'apps-outline',
};

export interface CategoryOption {
  key: string;
  label: string;
  icon: string;
  isBuiltin: boolean;
}

export function buildCategoryOptions(custom: string[]): CategoryOption[] {
  const builtin = BUILTIN_CATEGORIES.map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    icon: CATEGORY_ICONS[cat] ?? CUSTOM_CATEGORY_ICON,
    isBuiltin: true,
  }));
  const extra = custom
    .filter((cat) => !(BUILTIN_CATEGORIES as string[]).includes(cat))
    .map((cat) => ({
      key: cat,
      label: cat,
      icon: CUSTOM_CATEGORY_ICON,
      isBuiltin: false,
    }));
  return [...builtin, ...extra];
}
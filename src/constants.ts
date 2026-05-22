export const LANGUAGES = ['go', 'typescript', 'gorm', 'xorm'] as const;
export type Language = typeof LANGUAGES[number];

export const MODES = ['single', 'multi'] as const;
export type Mode = typeof MODES[number];

export const LANGUAGE_EXTENSIONS: Record<Language, string> = {
  typescript: '.ts',
  go: '.go',
  gorm: '.go',
  xorm: '.go',
};

export const LANGUAGES_REQUIRING_NAMESPACE: Language[] = ['go', 'gorm', 'xorm'];
export const DEFAULT_NAMESPACE = 'models';

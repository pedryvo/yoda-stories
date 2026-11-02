import { SupportedLanguage, TranslationDictionary } from './types';
import { en } from './en';
import { ptBR } from './pt-BR';
import { zhCN } from './zh-CN';
import { ru } from './ru';
import { de } from './de';

const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  'pt-BR': ptBR,
  'zh-CN': zhCN,
  ru,
  de,
};

let currentLanguage: SupportedLanguage = 'en';

// Detect browser default language
const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
if (browserLang.startsWith('pt')) {
  currentLanguage = 'pt-BR';
} else if (browserLang.startsWith('zh')) {
  currentLanguage = 'zh-CN';
} else if (browserLang.startsWith('ru')) {
  currentLanguage = 'ru';
} else if (browserLang.startsWith('de')) {
  currentLanguage = 'de';
}

const listeners: Array<(lang: SupportedLanguage, t: TranslationDictionary) => void> = [];

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage): void {
  if (translations[lang]) {
    currentLanguage = lang;
    const t = translations[lang];
    listeners.forEach((fn) => fn(lang, t));
  }
}

export function t(): TranslationDictionary {
  return translations[currentLanguage] || en;
}

export function onLanguageChange(
  callback: (lang: SupportedLanguage, t: TranslationDictionary) => void
): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export * from './types';

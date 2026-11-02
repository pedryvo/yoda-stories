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

export function detectUserLanguage(): SupportedLanguage {
  // 1. Check if user already has an explicit preference in localStorage
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('yoda_language') as SupportedLanguage;
    if (saved && translations[saved]) {
      return saved;
    }
  }

  // 2. Auto-detect from browser locale & regional settings
  if (typeof navigator !== 'undefined') {
    const candidates = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];

    for (const raw of candidates) {
      if (!raw) continue;
      const lower = raw.toLowerCase();
      if (lower.startsWith('pt')) return 'pt-BR';
      if (lower.startsWith('zh')) return 'zh-CN';
      if (lower.startsWith('ru')) return 'ru';
      if (lower.startsWith('de')) return 'de';
      if (lower.startsWith('en')) return 'en';
    }
  }

  return 'en';
}

let currentLanguage: SupportedLanguage = detectUserLanguage();

const listeners: Array<(lang: SupportedLanguage, t: TranslationDictionary) => void> = [];

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage): void {
  if (translations[lang]) {
    currentLanguage = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('yoda_language', lang);
    }
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

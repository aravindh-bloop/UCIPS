import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { en, TranslationKey } from './en';
import { bn } from './bn';
import { mr } from './mr';
import { gu } from './gu';
import { pa } from './pa';
import { hi } from './hi';
import { ml } from './ml';
import { kn } from './kn';
import { ta } from './ta';
import { te } from './te';

export type Language = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn' | 'bn' | 'mr' | 'gu' | 'pa';

const STORAGE_KEY = 'ucips.language';

const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  ta,
  hi,
  te,
  ml,
  kn,
  bn,
  mr,
  gu,
  pa,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a key, optionally interpolating `{param}` placeholders. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (['en', 'ta', 'hi', 'te', 'ml', 'kn', 'bn', 'mr', 'gu', 'pa'].includes(stored ?? '')) setLanguageState(stored as Language);
      } catch {
        // fall back to English if storage is unavailable
      }
    })();
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let value = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

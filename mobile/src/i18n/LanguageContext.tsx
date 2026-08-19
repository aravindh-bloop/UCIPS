import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { en, TranslationKey } from './en';
import { ta } from './ta';

export type Language = 'en' | 'ta';

const STORAGE_KEY = 'ucips.language';

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, ta };

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
        if (stored === 'en' || stored === 'ta') setLanguageState(stored);
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

import { Language } from './LanguageContext';

export function localeForLanguage(language: Language): string {
  const locales: Record<Language, string> = {
    en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN',
    bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN',
  };
  return locales[language];
}

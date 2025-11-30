import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import tr from './translations/tr.json';
import en from './translations/en.json';
import de from './translations/de.json';
import nl from './translations/nl.json';

export type Language = 'tr' | 'en' | 'de' | 'nl';

const translations = {
  tr,
  en,
  de,
  nl,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Language change event dispatcher
const languageChangeEvent = new EventTarget();

export const LANGUAGE_CHANGE_EVENT = 'language-change';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // LocalStorage'dan dili oku
    const saved = localStorage.getItem('language') as Language | null;
    return saved || 'tr'; // Varsayılan Türkçe
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // LocalStorage'a kaydet
    localStorage.setItem('language', lang);
    // HTML lang atributunu güncelle
    document.documentElement.lang = lang;
    // Event göndər tüm listeners'a bildir
    languageChangeEvent.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language: lang } }));
  }, []);

  useEffect(() => {
    // İlk yüklemede HTML lang'ı ayarla
    document.documentElement.lang = language;
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Çeviri bulunamazsa key'i döndür
      }
    }

    return typeof value === 'string' ? value : key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLanguageChange(callback: (lang: Language) => void) {
  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      if (event instanceof CustomEvent) {
        callback(event.detail.language);
      }
    };

    languageChangeEvent.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);

    return () => {
      languageChangeEvent.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    };
  }, [callback]);
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
];

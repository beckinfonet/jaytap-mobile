import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@jaytap_language';

export type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ru') {
        setLanguageState(stored);
      }
    } catch (e) {
      console.error('Failed to load language preference', e);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

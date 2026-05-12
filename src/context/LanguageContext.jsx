import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../data/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('clinic_lang');
    return saved === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('clinic_lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'ar') {
      setLanguageState(lang);
    }
  }, []);

  const t = useCallback((key) => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  }, [language]);

  const formatTime = useCallback((dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return t('minAgo').replace('{n}', diffMin);
    if (diffHour < 24) return t('hourAgo').replace('{n}', diffHour);
    return t('dayAgo').replace('{n}', diffDay);
  }, [t]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatTime }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

'use client';

import * as React from 'react';

export function LanguageToggle() {
  const [currentLang, setCurrentLang] = React.useState<'en' | 'ar'>('ar');

  React.useEffect(() => {
    const saved = localStorage.getItem('app_language') as 'en' | 'ar';
    const active = saved || 'ar';
    setCurrentLang(active);
    document.documentElement.lang = active;
    document.documentElement.dir = active === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const setLanguage = (lang: 'en' | 'ar') => {
    setCurrentLang(lang);
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.dispatchEvent(new Event('languagechange'));
  };

  return (
    <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`px-2 py-1 rounded-md font-medium transition-all ${
          currentLang === 'ar'
            ? 'bg-background text-foreground shadow-sm font-bold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="التحويل للغة العربية"
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-md font-medium transition-all ${
          currentLang === 'en'
            ? 'bg-background text-foreground shadow-sm font-bold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
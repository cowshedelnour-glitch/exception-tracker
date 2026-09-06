'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const [currentLang, setCurrentLang] = React.useState<'en' | 'ar'>('en');

  React.useEffect(() => {
    const saved = localStorage.getItem('app_language') as 'en' | 'ar';
    if (saved && (saved === 'en' || saved === 'ar')) {
      setCurrentLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    setCurrentLang(nextLang);
    localStorage.setItem('app_language', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 px-3 rounded-lg flex items-center gap-1.5 font-medium text-sm transition-colors duration-200"
      onClick={toggleLanguage}
      aria-label={currentLang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
      title={currentLang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      <Languages className="h-4 w-4" />
      <span>{currentLang === 'en' ? 'العربية' : 'English'}</span>
    </Button>
  );
}
'use client';

import { useEffect, useState } from 'react';

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<'en' | 'am'>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('tule-language');
    if (saved === 'am' || saved === 'en') setLanguage(saved);
  }, []);

  function changeLanguage(value: 'en' | 'am') {
    setLanguage(value);
    window.localStorage.setItem('tule-language', value);
    window.dispatchEvent(new CustomEvent('tule-language-change', { detail: value }));
  }

  return (
    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 text-[10px] font-extrabold uppercase tracking-[.12em] backdrop-blur">
      <button onClick={() => changeLanguage('en')} className={`rounded-full px-3 py-1.5 transition ${language === 'en' ? 'bg-white text-[#0B3D4A]' : 'text-white/65 hover:text-white'}`}>EN</button>
      <button onClick={() => changeLanguage('am')} className={`rounded-full px-3 py-1.5 transition ${language === 'am' ? 'bg-white text-[#0B3D4A]' : 'text-white/65 hover:text-white'}`}>አማ</button>
    </div>
  );
}

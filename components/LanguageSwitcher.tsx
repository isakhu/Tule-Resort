'use client';

import { useSyncExternalStore } from 'react';
import type { TuleLanguage } from '@/lib/tuleBrand';

const LANGUAGE_KEY = 'tule-language';
const LANGUAGE_EVENT = 'tule-language-change';

function readLanguageSnapshot(): TuleLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return saved === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

function subscribeLanguage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(LANGUAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export default function LanguageSwitcher() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    readLanguageSnapshot,
    (): TuleLanguage => 'en',
  );

  function changeLanguage(value: TuleLanguage) {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, value);
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: value }));
  }

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 text-[10px] font-extrabold uppercase tracking-[.12em] backdrop-blur"
    >
      <button
        type="button"
        aria-pressed={language === 'en'}
        aria-label="Switch language to English"
        onClick={() => changeLanguage('en')}
        className={`min-h-8 rounded-full px-2 sm:px-3 py-1.5 transition cursor-pointer ${
          language === 'en' ? 'bg-[#C5A46D] text-[#163D32] font-black' : 'text-[#F5F0E6]/80 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === 'am'}
        aria-label="Switch language to Amharic"
        onClick={() => changeLanguage('am')}
        className={`rounded-full px-3 py-1.5 transition cursor-pointer ${
          language === 'am' ? 'bg-[#C5A46D] text-[#163D32] font-black' : 'text-[#F5F0E6]/80 hover:text-white'
        }`}
      >
        አማ
      </button>
    </div>
  );
}

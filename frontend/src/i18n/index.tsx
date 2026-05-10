/**
 * Safe Order — Language context.
 * Persists the locale choice to localStorage and applies it to <html>
 * (lang + dir) so RTL works for Arabic.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Locale, RTL_LOCALES, translate } from './translations'

const STORAGE_KEY = 'safe_order_locale'

interface LanguageState {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageState | null>(null)

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'en' || stored === 'ar') return stored
  const browser = navigator.language?.slice(0, 2)
  if (browser === 'en' || browser === 'ar') return browser
  return 'fr'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  const applyToDocument = useCallback((l: Locale) => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = l
    document.documentElement.dir = RTL_LOCALES.includes(l) ? 'rtl' : 'ltr'
  }, [])

  useEffect(() => {
    applyToDocument(locale)
  }, [locale, applyToDocument])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch { /* storage unavailable */ }
  }, [])

  const t = useCallback((key: string) => translate(locale, key), [locale])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir: RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useT() {
  return useLanguage().t
}

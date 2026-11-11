import { create } from 'zustand'
import { STRINGS, type Lang } from '@/i18n/strings'

const KEY = 'hanami.lang'
const initial = (): Lang => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'ms' || saved === 'ja') return saved
    const nav = navigator.language.slice(0, 2)
    return nav === 'ms' || nav === 'id' ? 'ms' : nav === 'ja' ? 'ja' : 'en'
  } catch {
    return 'en'
  }
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}
export const useLang = create<LangState>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    try { localStorage.setItem(KEY, lang) } catch { /* private mode */ }
    set({ lang })
  },
}))

/** Translate a key (falls back to English, then to the key itself). */
export function useT() {
  const lang = useLang((s) => s.lang)
  return (key: string) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key
}

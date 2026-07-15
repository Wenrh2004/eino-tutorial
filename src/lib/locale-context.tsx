import * as React from 'react'
import type { Locale } from '@/lib/i18n'
import { DEFAULT_LOCALE } from '@/content/chapters'

const LocaleContext = React.createContext<Locale>(DEFAULT_LOCALE)

/** Makes the active locale available to MDX-embedded components. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return React.useContext(LocaleContext)
}

import * as React from 'react'
import {
  createFileRoute,
  notFound,
  Outlet,
  useLocation,
  useParams,
} from '@tanstack/react-router'
import { isLocale } from '@/lib/i18n'
import { LocaleProvider } from '@/lib/locale-context'
import { Header } from '@/components/docs/header'
import { Sidebar } from '@/components/docs/sidebar'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/$locale')({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) throw notFound()
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = useParams({ from: '/$locale' })
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // We validated in beforeLoad, but narrow again for type-safety.
  if (!isLocale(locale)) return null

  // Derive the active chapter slug from the URL for sidebar highlighting.
  const activeSlug = location.pathname.match(/\/chapters\/([^/]+)/)?.[1]

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-svh">
        <Header locale={locale} onMenuClick={() => setMobileOpen((o) => !o)} />

        <div className="mx-auto flex max-w-[100rem] gap-0 px-4 lg:px-6">
          {/* Sidebar: fixed rail on desktop, slide-over on mobile. */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r bg-background px-4 pt-16 transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100svh-4rem)] lg:w-64 lg:shrink-0 lg:translate-x-0 lg:border-r-0 lg:bg-transparent lg:pt-0',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <Sidebar
              locale={locale}
              activeSlug={activeSlug}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>

          {/* Backdrop for mobile slide-over. */}
          {mobileOpen && (
            <button
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <main className="min-w-0 flex-1 py-8 lg:pl-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LocaleProvider>
  )
}

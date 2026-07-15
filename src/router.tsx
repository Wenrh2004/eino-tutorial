import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultNotFoundComponent: () => (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-4xl font-bold">404</p>
        <p className="text-muted-foreground">Page not found.</p>
        <a href="/" className="text-primary underline underline-offset-4">
          Back to home
        </a>
      </div>
    ),
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

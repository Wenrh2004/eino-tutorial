/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'

import appCss from '../styles/app.css?url'

// Inline, render-blocking script that applies the stored theme before paint to
// avoid a flash of the wrong theme. Runs on the static HTML directly.
const noFlashThemeScript = `
(function () {
  try {
    var stored = localStorage.getItem('eino-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Eino by Mechanism — 以 ADK 为核心的可视化 Agent 教程' },
      {
        name: 'description',
        content:
          'An interactive, mechanism-visualization tutorial for the CloudWeGo Eino framework, centered on the Agent Development Kit (ADK).',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export function RootComponent() {
  return <Outlet />
}

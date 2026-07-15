import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_LOCALE } from '@/content/chapters'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$locale', params: { locale: DEFAULT_LOCALE } })
  },
})

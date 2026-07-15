/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { MDXProps } from 'mdx/types'
  import type { ReactElement } from 'react'
  export const frontmatter: Record<string, unknown>
  const MDXComponent: (props: MDXProps) => ReactElement
  export default MDXComponent
}

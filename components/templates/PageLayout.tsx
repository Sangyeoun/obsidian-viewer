import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/organisms/SiteHeader'

interface PageLayoutProps {
  readonly children: ReactNode
}

/** PageLayout - 모든 페이지에 공통 헤더와 좌우 여백을 적용하는 템플릿. */
export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  )
}

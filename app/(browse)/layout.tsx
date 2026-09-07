import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/organisms/SiteHeader'
import { NoteSidebar } from '@/components/organisms/NoteSidebar'
import { listNotes } from '@/application/vault/listNotes'
import { vaultRepository } from '@/application/vault/vaultRepository'

interface BrowseLayoutProps {
  readonly children: ReactNode
}

/**
 * BrowseLayout - 홈(/)과 노트 상세(/notes/[...slug])가 공유하는 2단 레이아웃.
 * 좌측 NoteSidebar는 라우트 전환 시 리마운트되지 않고 유지되며, children만 교체된다.
 * Design Ref: §2.1 Component Diagram
 */
export default async function BrowseLayout({ children }: BrowseLayoutProps) {
  const notes = await listNotes(vaultRepository)

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-y-auto border-r border-neutral-200 px-4 py-6 dark:border-neutral-800">
        <NoteSidebar notes={notes} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}

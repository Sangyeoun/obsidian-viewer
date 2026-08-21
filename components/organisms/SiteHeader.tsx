import Link from 'next/link'

/** SiteHeader - 모든 페이지 상단에 표시되는 네비게이션 헤더. */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          🗂️ Obsidian Viewer
        </Link>
        <nav className="text-sm text-neutral-500 dark:text-neutral-400">
          <span>vault/*.md 를 읽어 렌더링합니다</span>
        </nav>
      </div>
    </header>
  )
}

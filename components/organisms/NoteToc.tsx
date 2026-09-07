'use client'

import { useEffect, useState } from 'react'
import type { NoteHeading } from '@/domain/note/Note'

const INDENT_BY_DEPTH: Record<NoteHeading['depth'], string> = {
  1: 'pl-0',
  2: 'pl-0',
  3: 'pl-3',
  4: 'pl-6',
}

interface NoteTocProps {
  readonly headings: readonly NoteHeading[]
}

/**
 * NoteToc - 노트 본문의 목차(TOC)를 우측 sticky 패널로 표시한다.
 * 클릭 시 앵커 이동, 스크롤 중에는 IntersectionObserver로 현재 섹션을 강조한다.
 * Design Ref: note-toc §5.1, §5.4 — headings가 비어 있으면 호출부(page.tsx)에서 렌더링하지 않는다.
 */
export function NoteToc({ headings }: NoteTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null)

    if (headingElements.length === 0) return

    // Plan SC: 스크롤 중 현재 보이는 섹션의 목차 항목을 시각적으로 강조한다.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return

        const topMost = visible.reduce((closest, entry) =>
          entry.boundingClientRect.top < closest.boundingClientRect.top ? entry : closest,
        )
        setActiveId(topMost.target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const element of headingElements) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [headings])

  return (
    <nav aria-label="목차" className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto text-sm">
      <p className="mb-2 font-semibold text-neutral-500 dark:text-neutral-400">목차</p>
      <ul className="space-y-1.5 border-l border-neutral-200 dark:border-neutral-800">
        {headings.map((heading) => (
          <li key={heading.id} className={INDENT_BY_DEPTH[heading.depth]}>
            <a
              href={`#${heading.id}`}
              className={
                heading.id === activeId
                  ? '-ml-px block border-l-2 border-violet-600 pl-3 font-medium text-violet-600 dark:border-violet-400 dark:text-violet-400'
                  : '-ml-px block border-l-2 border-transparent pl-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

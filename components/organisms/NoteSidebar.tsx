'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Note } from '@/domain/note/Note'
import { searchNotes } from '@/application/vault/searchNotes'
import { buildNoteTree, getAncestorFolderPaths } from '@/application/vault/buildNoteTree'
import { SearchInput } from '@/components/atoms/SearchInput'
import { NoteListItem } from '@/components/molecules/NoteListItem'
import { FolderTreeItem } from '@/components/molecules/FolderTreeItem'

const NOTES_PATH_PREFIX = '/notes/'

interface NoteSidebarProps {
  readonly notes: readonly Note[]
}

/**
 * NoteSidebar - 좌측 사이드바. 검색어 상태를 관리하고 폴더 트리로 노트 목록을 보여준다.
 * 현재 선택된 노트는 URL(usePathname)에서 파생하므로 별도 전역 상태가 필요 없다.
 * Design Ref: §2.2 선택 상태 판단, §2.2 Data Flow(접힘 상태 관리)
 */
export function NoteSidebar({ notes }: NoteSidebarProps) {
  const [query, setQuery] = useState('')
  const pathname = usePathname()
  const selectedSlug = pathname.startsWith(NOTES_PATH_PREFIX)
    ? safeDecodeURIComponent(pathname.slice(NOTES_PATH_PREFIX.length))
    : null

  const [manuallyToggled, setManuallyToggled] = useState<ReadonlyMap<string, boolean>>(new Map())

  const filtered = searchNotes(notes, query)
  const tree = useMemo(() => buildNoteTree(filtered), [filtered])

  const autoExpandedFolders = useMemo(() => {
    const paths = new Set<string>()
    // Design Ref: sidebar-tree-view §5.2 — 검색 중이면 일치하는 노트의 조상 폴더만 펼치고,
    // 검색 중이 아니면 현재 선택된 노트의 조상 폴더만 펼친다(선택도 검색도 없으면 전부 접힘).
    const source = query.trim() !== '' ? filtered.map((n) => n.slug) : selectedSlug !== null ? [selectedSlug] : []
    for (const slug of source) {
      for (const ancestor of getAncestorFolderPaths(slug)) {
        paths.add(ancestor)
      }
    }
    return paths
  }, [query, selectedSlug, filtered])

  const expandedFolders = useMemo(() => {
    const result = new Set(autoExpandedFolders)
    for (const [path, isExpanded] of manuallyToggled) {
      if (isExpanded) {
        result.add(path)
      } else {
        result.delete(path)
      }
    }
    return result
  }, [autoExpandedFolders, manuallyToggled])

  const handleToggle = (path: string) => {
    setManuallyToggled((prev) => {
      const next = new Map(prev)
      next.set(path, !expandedFolders.has(path))
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} />
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
            검색 결과가 없습니다.
          </p>
        ) : (
          tree.map((node) =>
            node.type === 'folder' ? (
              <FolderTreeItem
                key={node.path}
                name={node.name}
                path={node.path}
                nodes={node.children}
                isExpanded={expandedFolders.has(node.path)}
                onToggle={handleToggle}
                expandedFolders={expandedFolders}
                selectedSlug={selectedSlug}
              />
            ) : (
              <NoteListItem
                key={node.note.slug}
                note={node.note}
                isSelected={node.note.slug === selectedSlug}
              />
            ),
          )
        )}
      </nav>
    </div>
  )
}

// 잘못된 percent-encoding이 포함된 경로(예: '%'가 그대로 들어간 slug)는
// decodeURIComponent가 URIError를 던져 사이드바 전체가 크래시하므로 원문으로 폴백한다.
function safeDecodeURIComponent(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

import type { Note } from '@/domain/note/Note'

export interface TagCount {
  readonly tag: string
  readonly count: number
}

/**
 * buildTagIndex - 노트 목록에서 태그별 노트 개수를 집계해 태그명 오름차순으로 반환한다.
 * Design Ref: §2.2 태그 인덱스(FR-03)
 */
export function buildTagIndex(notes: readonly Note[]): readonly TagCount[] {
  const counts = new Map<string, number>()

  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) =>
    a.tag.localeCompare(b.tag),
  )
}

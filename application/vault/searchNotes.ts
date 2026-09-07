import type { Note } from '@/domain/note/Note'
import { getNoteTitle } from '@/domain/note/Note'

/**
 * searchNotes - 노트 제목 또는 본문에 검색어가 포함된 노트만 필터링한다.
 * Design Ref: §2.2 검색(FR-01)
 */
export function searchNotes(notes: readonly Note[], query: string): readonly Note[] {
  const trimmedQuery = query.trim().toLowerCase()
  if (trimmedQuery === '') return notes

  return notes.filter((note) => {
    const title = getNoteTitle(note).toLowerCase()
    const content = note.rawContent.toLowerCase()
    return title.includes(trimmedQuery) || content.includes(trimmedQuery)
  })
}

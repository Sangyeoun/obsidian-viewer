import type { Note } from '@/domain/note/Note'
import type { NoteRepository } from '@/domain/note/NoteRepository'

/**
 * listNotes - vault 내 모든 노트를 최신 날짜순으로 정렬하여 반환하는 유스케이스.
 * date가 없는 노트는 목록 뒤쪽에 배치된다.
 */
export async function listNotes(repository: NoteRepository): Promise<readonly Note[]> {
  const notes = await repository.findAll()
  return [...notes].sort((a, b) => {
    const dateA = a.frontmatter.date
    const dateB = b.frontmatter.date
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateB.localeCompare(dateA)
  })
}

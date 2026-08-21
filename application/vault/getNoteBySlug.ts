import type { Note } from '@/domain/note/Note'
import type { NoteRepository } from '@/domain/note/NoteRepository'

/**
 * getNoteBySlug - 슬러그로 단일 노트를 조회하는 유스케이스.
 */
export async function getNoteBySlug(
  repository: NoteRepository,
  slug: string,
): Promise<Note | null> {
  return repository.findBySlug(slug)
}

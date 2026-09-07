import type { Note } from '@/domain/note/Note'
import type { NoteRepository } from '@/domain/note/NoteRepository'

/**
 * getNoteBySlug - 슬러그로 단일 노트를 조회하는 유스케이스.
 * Design Ref: §2.2 링크 무결성(FR-04) — 전체 슬러그 목록을 먼저 확보해 끊긴 위키링크를 감지한다.
 */
export async function getNoteBySlug(
  repository: NoteRepository,
  slug: string,
): Promise<Note | null> {
  const slugs = await repository.listSlugs()
  const allSlugs = new Set(slugs)
  const nameToSlugMap = buildNameToSlugMap(slugs)
  return repository.findBySlug(slug, allSlugs, nameToSlugMap)
}

// Design Ref: §11.2 module-2 — FileSystemNoteRepository.buildNameToSlugMap과 동일한
// 파일명 -> full slug 역매핑을 단일 노트 조회 경로에서도 구성한다.
function buildNameToSlugMap(slugs: readonly string[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const slug of slugs) {
    const name = slug.split('/').pop() ?? slug
    if (!map.has(name)) {
      map.set(name, slug)
    }
  }
  return map
}

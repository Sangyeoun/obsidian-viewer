import type { Note } from './Note'

/**
 * NoteRepository - 노트 데이터 접근을 위한 포트(인터페이스).
 *
 * 구체적인 저장 방식(파일시스템, 향후 Git/API 등)은 infrastructure 레이어에서
 * 이 인터페이스를 구현한다. domain/application 레이어는 이 인터페이스에만 의존한다.
 */
export interface NoteRepository {
  findAll(): Promise<readonly Note[]>
  findBySlug(slug: string): Promise<Note | null>
}

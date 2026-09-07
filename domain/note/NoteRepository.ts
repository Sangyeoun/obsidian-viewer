import type { Note } from './Note'

/**
 * NoteRepository - 노트 데이터 접근을 위한 포트(인터페이스).
 *
 * 구체적인 저장 방식(파일시스템, 향후 Git/API 등)은 infrastructure 레이어에서
 * 이 인터페이스를 구현한다. domain/application 레이어는 이 인터페이스에만 의존한다.
 */
export interface NoteRepository {
  findAll(): Promise<readonly Note[]>
  /**
   * allSlugs: vault 전체 슬러그 집합을 미리 알고 있다면 전달한다.
   * 위키링크 무결성 검사(끊긴 링크 감지)에 사용되며, 생략하면 검사를 건너뛴다.
   * nameToSlugMap: 파일명(확장자 제외) -> full slug 역매핑. 하위 폴더에 있는 노트를
   * 가리키는 위키링크(`[[파일명]]`)를 올바른 slug로 해석하기 위해 사용하며, 생략하면 해석을 건너뛴다.
   */
  findBySlug(
    slug: string,
    allSlugs?: ReadonlySet<string>,
    nameToSlugMap?: ReadonlyMap<string, string>,
  ): Promise<Note | null>
  listSlugs(): Promise<readonly string[]>
}

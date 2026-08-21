/**
 * Note - Obsidian vault의 마크다운 노트 하나를 나타내는 도메인 엔티티.
 *
 * 불변 객체로 다룬다. 필드를 변경하려면 새 Note를 만들어야 한다.
 */
export interface NoteFrontmatter {
  readonly title?: string
  readonly tags?: readonly string[]
  readonly date?: string
}

export interface Note {
  /** 파일명(확장자 제외)에서 유래한 고유 슬러그. 라우팅에 사용된다. */
  readonly slug: string
  readonly frontmatter: NoteFrontmatter
  /** frontmatter를 제외한 원본 마크다운 본문. */
  readonly rawContent: string
  /** 렌더링된 HTML (위키링크/콜아웃/태그 처리 완료). */
  readonly html: string
  /** 본문에서 추출한 태그 (frontmatter tags + 인라인 #tag). */
  readonly tags: readonly string[]
  /** 이 노트가 위키링크로 참조하는 다른 노트들의 슬러그. */
  readonly linkedSlugs: readonly string[]
}

export function createNote(params: {
  slug: string
  frontmatter: NoteFrontmatter
  rawContent: string
  html: string
  tags: readonly string[]
  linkedSlugs: readonly string[]
}): Note {
  return {
    slug: params.slug,
    frontmatter: params.frontmatter,
    rawContent: params.rawContent,
    html: params.html,
    tags: params.tags,
    linkedSlugs: params.linkedSlugs,
  }
}

export function getNoteTitle(note: Note): string {
  return note.frontmatter.title ?? note.slug
}

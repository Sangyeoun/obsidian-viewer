import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remarkWikilink } from './remarkWikilink'
import type { RemarkWikilinkOptions } from './remarkWikilink'
import { remarkCallout } from './remarkCallout'
import { remarkHashtag } from './remarkHashtag'
import { remarkExtractHeadings } from './remarkExtractHeadings'
import type { NoteHeading } from '@/domain/note/Note'

export interface MarkdownToHtmlOptions {
  /** vault 전체 노트 슬러그 집합. 위키링크 무결성 검사(FR-04)에 사용된다. */
  readonly allSlugs?: RemarkWikilinkOptions['allSlugs']
  readonly sourceSlug?: RemarkWikilinkOptions['sourceSlug']
  /** 파일명 -> full slug 역매핑. 하위 폴더 노트를 가리키는 위키링크 해석에 사용된다. */
  readonly nameToSlugMap?: RemarkWikilinkOptions['nameToSlugMap']
  /** 이미지 임베드 발견 시 호출되는 콜백. vault-assets 복사 대상 수집에 사용된다. */
  readonly onImageEmbed?: RemarkWikilinkOptions['onImageEmbed']
}

export interface MarkdownToHtmlResult {
  readonly html: string
  /** 본문에서 추출한 목차 데이터 (H1~H4). Design Ref: note-toc §2.2 */
  readonly headings: readonly NoteHeading[]
}

/**
 * markdownToHtml - Obsidian 마크다운 본문을 HTML 문자열로 변환한다.
 *
 * 처리 순서: GFM(표/체크리스트/취소선) -> 위키링크 -> 콜아웃 -> 해시태그 -> 목차 추출 -> HTML 변환 -> 헤딩에 id 부여.
 */
export async function markdownToHtml(
  markdown: string,
  options: MarkdownToHtmlOptions = {},
): Promise<MarkdownToHtmlResult> {
  const headings: NoteHeading[] = []

  const file = await remark()
    .use(remarkGfm)
    .use(remarkWikilink, {
      allSlugs: options.allSlugs,
      sourceSlug: options.sourceSlug,
      nameToSlugMap: options.nameToSlugMap,
      onImageEmbed: options.onImageEmbed,
    })
    .use(remarkCallout)
    .use(remarkHashtag)
    .use(remarkExtractHeadings, { headings })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(markdown)

  return { html: String(file), headings }
}

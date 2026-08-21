import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remarkWikilink } from './remarkWikilink'
import { remarkCallout } from './remarkCallout'
import { remarkHashtag } from './remarkHashtag'

/**
 * markdownToHtml - Obsidian 마크다운 본문을 HTML 문자열로 변환한다.
 *
 * 처리 순서: GFM(표/체크리스트/취소선) -> 위키링크 -> 콜아웃 -> 해시태그 -> HTML 변환 -> 헤딩에 id 부여.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkWikilink)
    .use(remarkCallout)
    .use(remarkHashtag)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}

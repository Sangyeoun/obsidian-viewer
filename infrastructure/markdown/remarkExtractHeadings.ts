import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'
import type { Root, Heading, PhrasingContent } from 'mdast'
import type { NoteHeading } from '@/domain/note/Note'

const MAX_TOC_DEPTH = 4

export interface RemarkExtractHeadingsOptions {
  /** 파싱된 헤딩을 순서대로 담을 배열. 플러그인이 mutate한다. */
  readonly headings: NoteHeading[]
}

/**
 * remarkExtractHeadings - 마크다운 본문의 H1~H4 헤딩을 파싱해 목차(TOC) 데이터로 수집하는 remark 플러그인.
 *
 * id는 rehype-slug(github-slugger)와 동일한 알고리즘으로 생성해 본문 heading의 id와 일치시킨다.
 * Design Ref: note-toc §2.0 — rehype-slug가 내부적으로 사용하는 github-slugger를 그대로 재사용.
 */
export function remarkExtractHeadings(options: RemarkExtractHeadingsOptions) {
  const { headings } = options

  return (tree: Root) => {
    // Design Ref: note-toc §6.1 — rehype-slug는 트리 방문 시작 시 slugger를 reset하므로,
    // 노트 1개(=markdownToHtml 1회 호출)마다 새 인스턴스를 사용해 동일한 시퀀스를 재현한다.
    const slugger = new GithubSlugger()

    visit(tree, 'heading', (node: Heading) => {
      if (node.depth > MAX_TOC_DEPTH) return

      const text = headingToText(node.children)
      if (text.length === 0) return

      headings.push({
        depth: node.depth as 1 | 2 | 3 | 4,
        text,
        id: slugger.slug(text),
      })
    })
  }
}

// hast-util-to-string과 동등하게, 인라인 노드를 재귀적으로 순회하며 텍스트만 이어붙인다.
function headingToText(nodes: readonly PhrasingContent[]): string {
  return nodes.map(nodeToText).join('')
}

function nodeToText(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return node.value
    case 'break':
      return ' '
    default:
      return 'children' in node ? headingToText(node.children) : ''
  }
}

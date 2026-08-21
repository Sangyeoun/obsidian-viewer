import { visit } from 'unist-util-visit'
import type { Root, Blockquote, Paragraph, Text, Strong } from 'mdast'

const CALLOUT_PATTERN = /^\[!(\w+)\]\s*(.*)$/

/**
 * remarkCallout - Obsidian 콜아웃 문법 `> [!note] 제목` 을 감지해
 * blockquote 노드에 콜아웃 타입/제목 메타데이터를 부여하는 remark 플러그인.
 *
 * 실제 스타일링은 rehype 단계에서 hProperties의 className으로 적용된다.
 */
export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const firstChild = node.children[0]
      if (!firstChild || firstChild.type !== 'paragraph') return

      const paragraph = firstChild as Paragraph
      const firstText = paragraph.children[0]
      if (!firstText || firstText.type !== 'text') return

      const textNode = firstText as Text
      const match = CALLOUT_PATTERN.exec(textNode.value)
      if (!match) return

      const [, type, restOfTitle] = match
      const calloutType = type.toLowerCase()
      const title = restOfTitle.trim() || capitalize(calloutType)

      // 첫 줄의 "[!type] 제목" 마커 텍스트 노드를 실제 표시용 제목 노드로 교체한다.
      // CALLOUT_PATTERN이 `^...$`로 라인 전체에 매치되므로 textNode 전체가 마커다.
      const titleNode: Strong = {
        type: 'strong',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: title }],
      }
      paragraph.children[0] = titleNode

      node.data = {
        ...node.data,
        hProperties: {
          className: ['callout', `callout-${calloutType}`],
          'data-callout': calloutType,
          'data-callout-title': title,
        },
      }
    })
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

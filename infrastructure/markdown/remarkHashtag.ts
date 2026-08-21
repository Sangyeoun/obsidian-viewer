import { visit } from 'unist-util-visit'
import type { Root, Text, Link } from 'mdast'

// #tag 형태의 인라인 해시태그. 이메일/색상 코드 등과 헷갈리지 않도록
// 공백 또는 줄 시작 뒤에 오는 경우만 매칭한다.
const HASHTAG_PATTERN = /(^|\s)#([a-zA-Z0-9_-]+)/g

/**
 * remarkHashtag - 본문에 등장하는 `#tag` 인라인 텍스트를 태그 링크로 변환하는 remark 플러그인.
 * 코드 블록/인라인 코드 내부는 remark가 text 노드로 취급하지 않으므로 자동으로 제외된다.
 */
export function remarkHashtag() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || typeof index !== 'number') return
      if (!node.value.includes('#')) return

      const children: (Text | Link)[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      HASHTAG_PATTERN.lastIndex = 0
      while ((match = HASHTAG_PATTERN.exec(node.value)) !== null) {
        const [fullMatch, leadingSpace, tagName] = match
        const matchStart = match.index

        if (matchStart > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, matchStart) })
        }
        if (leadingSpace) {
          children.push({ type: 'text', value: leadingSpace })
        }

        children.push({
          type: 'link',
          url: `/tags/${tagName.toLowerCase()}`,
          data: { hProperties: { className: ['tag-link'], 'data-tag': tagName.toLowerCase() } },
          children: [{ type: 'text', value: `#${tagName}` }],
        })

        lastIndex = matchStart + fullMatch.length
      }

      if (children.length === 0) return

      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      parent.children.splice(index, 1, ...children)
      return index + children.length
    })
  }
}

/** 마크다운 원문에서 인라인 #태그 목록만 추출한다. */
export function extractInlineTags(markdown: string): string[] {
  const tags = new Set<string>()
  let match: RegExpExecArray | null
  const pattern = new RegExp(HASHTAG_PATTERN)
  while ((match = pattern.exec(markdown)) !== null) {
    tags.add(match[2].toLowerCase())
  }
  return Array.from(tags)
}

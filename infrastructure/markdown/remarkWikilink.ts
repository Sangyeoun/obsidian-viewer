import { visit } from 'unist-util-visit'
import type { Root, Text, Link } from 'mdast'

const WIKILINK_PATTERN = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g

/**
 * remarkWikilink - Obsidian 위키링크 문법 `[[note-name]]` 또는 `[[note-name|표시명]]`을
 * 표준 마크다운 링크(mdast Link 노드)로 변환하는 remark 플러그인.
 *
 * 변환된 링크의 url은 `/notes/{slug}` 형태이며, slug는 노트명을 kebab 형태로 정규화한다.
 */
export function remarkWikilink() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || typeof index !== 'number') return
      if (!node.value.includes('[[')) return

      const children: (Text | Link)[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      WIKILINK_PATTERN.lastIndex = 0
      while ((match = WIKILINK_PATTERN.exec(node.value)) !== null) {
        const [fullMatch, rawTarget, , rawDisplay] = match
        const matchStart = match.index

        if (matchStart > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, matchStart) })
        }

        const target = rawTarget.trim()
        const slug = slugifyNoteName(target)
        const display = rawDisplay?.trim() ?? target

        children.push({
          type: 'link',
          url: `/notes/${slug}`,
          data: { hProperties: { className: ['wikilink'], 'data-wikilink': slug } },
          children: [{ type: 'text', value: display }],
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

/** 노트명을 URL-safe한 슬러그로 정규화한다. (공백 -> '-', 소문자화) */
export function slugifyNoteName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

/** 마크다운 원문에서 위키링크가 참조하는 슬러그 목록만 추출한다 (링크 그래프 구성용). */
export function extractWikilinkSlugs(markdown: string): string[] {
  const slugs = new Set<string>()
  let match: RegExpExecArray | null
  const pattern = new RegExp(WIKILINK_PATTERN)
  while ((match = pattern.exec(markdown)) !== null) {
    slugs.add(slugifyNoteName(match[1]))
  }
  return Array.from(slugs)
}

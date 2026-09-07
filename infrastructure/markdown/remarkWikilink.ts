import { visit } from 'unist-util-visit'
import type { Root, Text, Link, Image } from 'mdast'

// Design Ref: wikilink-image-embed §Implementation Order 1 — 선행하는 '!'(임베드 표시)를
// 별도 캡처 그룹으로 잡아 일반 위키링크와 이미지/파일 임베드를 구분한다.
const WIKILINK_PATTERN = /(!?)\[\[([^\]|]+)(\|([^\]]+))?\]\]/g

// Design Ref: wikilink-image-embed §3.2 — 실제 <img>로 렌더링할 임베드 확장자 목록.
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

export interface RemarkWikilinkOptions {
  /** vault 전체 노트 슬러그 집합. 주어지면 존재하지 않는 슬러그를 가리키는 링크를 끊긴 링크로 표시한다. */
  readonly allSlugs?: ReadonlySet<string>
  /** 경고 로그에 표시할 링크 출처 노트 슬러그. */
  readonly sourceSlug?: string
  /**
   * 파일명(slugify 전) -> full slug 역매핑. Obsidian 위키링크는 폴더 경로 없이
   * 파일명만 참조하므로, 하위 폴더에 있는 노트를 가리키는 링크를 올바른 slug로 해석하기 위해 사용한다.
   * Design Ref: §11.2 module-2
   */
  readonly nameToSlugMap?: ReadonlyMap<string, string>
  /**
   * 이미지 임베드(`![[파일.webp]]`)를 발견할 때마다 원본 파일명을 전달받는 콜백.
   * FileSystemNoteRepository가 이 파일명들을 vault에서 찾아 public/vault-assets/로 복사하는 데 사용한다.
   * Design Ref: wikilink-image-embed §2.1
   */
  readonly onImageEmbed?: (fileName: string) => void
}

/**
 * remarkWikilink - Obsidian 위키링크 문법 `[[note-name]]` 또는 `[[note-name|표시명]]`을
 * 표준 마크다운 링크(mdast Link 노드)로 변환하는 remark 플러그인.
 *
 * 변환된 링크의 url은 `/notes/{slug}` 형태이며, slug는 노트명을 kebab 형태로 정규화한다.
 * Design Ref: §2.2 링크 무결성(FR-04) — allSlugs가 주어지면 존재하지 않는 슬러그를 감지해
 * 'wikilink-broken' 클래스를 부여하고 빌드 로그에 경고를 남긴다.
 */
export function remarkWikilink(options: RemarkWikilinkOptions = {}) {
  const { allSlugs, sourceSlug, nameToSlugMap, onImageEmbed } = options

  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || typeof index !== 'number') return
      if (!node.value.includes('[[')) return

      const children: (Text | Link | Image)[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      WIKILINK_PATTERN.lastIndex = 0
      while ((match = WIKILINK_PATTERN.exec(node.value)) !== null) {
        const [fullMatch, embedMark, rawTarget, , rawDisplay] = match
        const matchStart = match.index
        const isEmbed = embedMark === '!'

        if (matchStart > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, matchStart) })
        }

        const target = rawTarget.trim()

        if (isEmbed && isImageFileName(target)) {
          children.push(createImageEmbedNode(target, rawDisplay))
          onImageEmbed?.(target)
        } else if (isEmbed) {
          // 이미지가 아닌 임베드(노트/기타 파일 삽입)는 이번 범위 밖이므로 링크로 변환하지 않고
          // 원문을 그대로 보존한다. Design Ref: wikilink-image-embed §6.1
          children.push({ type: 'text', value: fullMatch })
        } else {
          const slug = resolveWikilinkSlug(target, nameToSlugMap)
          const display = rawDisplay?.trim() ?? target
          const isBroken = allSlugs !== undefined && !allSlugs.has(slug)

          if (isBroken) {
            console.warn(
              `[wikilink] broken link: "${slug}" referenced from "${sourceSlug ?? 'unknown'}"`,
            )
          }

          children.push({
            type: 'link',
            url: `/notes/${slug}`,
            data: {
              hProperties: {
                className: isBroken ? ['wikilink', 'wikilink-broken'] : ['wikilink'],
                'data-wikilink': slug,
              },
            },
            children: [{ type: 'text', value: display }],
          })
        }

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

/** 파일명 확장자가 <img>로 렌더링할 이미지 형식인지 판단한다. */
function isImageFileName(fileName: string): boolean {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  return IMAGE_EXTENSIONS.has(extension)
}

// Design Ref: wikilink-image-embed §5.1 — `![[파일.webp|1200]]`을 <img>로 변환한다.
// 파이프 뒤 숫자는 Obsidian의 표시 너비 지정이므로 width 속성으로 반영한다.
function createImageEmbedNode(fileName: string, rawDisplay: string | undefined): Image {
  const display = rawDisplay?.trim()
  const width = display !== undefined && /^\d+$/.test(display) ? display : undefined

  return {
    type: 'image',
    url: `/vault-assets/${fileName}`,
    alt: fileName,
    data: {
      hProperties: {
        className: ['embedded-image'],
        ...(width ? { width } : {}),
      },
    },
  }
}

// macOS(APFS)는 한글이 포함된 파일명을 NFD(자모 분리형)로 저장해 readdir 결과가 NFD로
// 반환되지만, 마크다운 본문의 위키링크 텍스트는 보통 NFC(완성형)로 입력된다. 정규화하지
// 않으면 코드포인트가 달라 동일한 이름도 slug가 일치하지 않는다.
/** 노트명을 URL-safe한 슬러그로 정규화한다. (유니코드 NFC 정규화, 공백 -> '-', 소문자화) */
export function slugifyNoteName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, '-')
}

const MARKDOWN_EXTENSION = '.md'

// Obsidian은 위키링크를 파일명만(`[[note]]`) 또는 vault 루트 기준 전체 경로+확장자
// (`[[folder/note.md]]`)로 저장할 수 있다. 후자의 경우 .md를 제거하고 경로 세그먼트별로
// slugifyNoteName을 적용해야 FileSystemNoteRepository가 생성한 slug와 일치한다.
// nameToSlugMap의 key는 이미 slugify된 파일명이므로, 조회 전에 target도 slugify해야 한다
// (그렇지 않으면 대소문자/공백이 섞인 원본 파일명은 항상 조회에 실패한다).
function resolveWikilinkSlug(
  target: string,
  nameToSlugMap: ReadonlyMap<string, string> | undefined,
): string {
  const withoutExtension = target.endsWith(MARKDOWN_EXTENSION)
    ? target.slice(0, -MARKDOWN_EXTENSION.length)
    : target

  if (!withoutExtension.includes('/')) {
    return nameToSlugMap?.get(slugifyNoteName(withoutExtension)) ?? slugifyNoteName(withoutExtension)
  }

  const fileName = withoutExtension.split('/').pop() ?? withoutExtension
  const mappedByFileName = nameToSlugMap?.get(slugifyNoteName(fileName))
  if (mappedByFileName !== undefined) return mappedByFileName

  return withoutExtension
    .split('/')
    .map((segment) => slugifyNoteName(segment))
    .join('/')
}

/**
 * 마크다운 원문에서 위키링크가 참조하는 슬러그 목록만 추출한다 (링크 그래프 구성용).
 * 이미지/파일 임베드(`![[...]]`)는 노트 간 링크가 아니므로 제외한다.
 */
export function extractWikilinkSlugs(
  markdown: string,
  nameToSlugMap?: ReadonlyMap<string, string>,
): string[] {
  const slugs = new Set<string>()
  let match: RegExpExecArray | null
  const pattern = new RegExp(WIKILINK_PATTERN)
  while ((match = pattern.exec(markdown)) !== null) {
    const [, embedMark, rawTarget] = match
    if (embedMark === '!') continue
    slugs.add(resolveWikilinkSlug(rawTarget.trim(), nameToSlugMap))
  }
  return Array.from(slugs)
}

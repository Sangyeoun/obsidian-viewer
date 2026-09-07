import { readdir, readFile, mkdir, copyFile } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'
import type { Note, NoteFrontmatter } from '@/domain/note/Note'
import { createNote } from '@/domain/note/Note'
import type { NoteRepository } from '@/domain/note/NoteRepository'
import { markdownToHtml } from '@/infrastructure/markdown/markdownToHtml'
import { extractWikilinkSlugs, slugifyNoteName } from '@/infrastructure/markdown/remarkWikilink'
import { extractInlineTags } from '@/infrastructure/markdown/remarkHashtag'

const MARKDOWN_EXTENSION = '.md'

// Design Ref: wikilink-image-embed §2.2 — 참조된 이미지를 복사할 정적 서빙 폴더.
const VAULT_ASSETS_DIR = path.join(process.cwd(), 'public', 'vault-assets')

/**
 * FileSystemNoteRepository - 로컬 파일시스템의 Obsidian vault 폴더에서
 * 마크다운 파일을 읽어 Note 도메인 객체로 변환하는 NoteRepository 구현체.
 *
 * 빌드 타임(정적 생성)에 호출되는 것을 전제로 하며, 매 호출마다 vault 디렉터리를
 * 다시 읽는다 (요청마다 새로 읽지 않도록 상위에서 캐싱 여부를 결정한다).
 */
interface WalkEntry {
  /** URL-safe 슬러그 (소문자 정규화, '/' 구분) */
  readonly slug: string
  /** 실제 파일시스템 경로 (원본 대소문자 보존) */
  readonly filePath: string
}

export class FileSystemNoteRepository implements NoteRepository {
  // Design Ref: 하이드레이션 버그 수정 — 같은 요청(RSC 렌더) 안에서 findAll/findBySlug/
  // listSlugs가 각자 파일시스템을 다시 읽으면 readdir 순서가 호출마다 달라져 서버/클라이언트
  // 렌더 결과가 어긋난다. React cache()로 요청당 1회만 스캔하도록 고정한다.
  private readonly walkVault = cache((dir: string) => this.walk(dir))

  constructor(private readonly vaultDir: string) {}

  async findAll(): Promise<readonly Note[]> {
    const entries = await this.walkVault(this.vaultDir)
    const allSlugs = new Set(entries.map((entry) => entry.slug))
    const nameToSlugMap = buildNameToSlugMap(entries.map((entry) => entry.slug))
    const embeddedImageNames = new Set<string>()
    const notes = await Promise.all(
      entries.map((entry) =>
        this.readNote(entry.slug, entry.filePath, allSlugs, nameToSlugMap, (fileName) =>
          embeddedImageNames.add(fileName),
        ),
      ),
    )
    await this.copyEmbeddedImages(embeddedImageNames)
    return notes.filter((note): note is Note => note !== null)
  }

  // Design Ref: §2.2 링크 무결성(FR-04) — allSlugs가 주어지면 markdownToHtml에 전달해
  // 존재하지 않는 슬러그를 가리키는 위키링크를 감지한다.
  // Design Ref: §11.2 module-2 — nameToSlugMap이 주어지면 위키링크의 파일명을
  // 폴더 경로가 포함된 full slug로 해석할 수 있도록 markdownToHtml에 전달한다.
  async findBySlug(
    slug: string,
    allSlugs?: ReadonlySet<string>,
    nameToSlugMap?: ReadonlyMap<string, string>,
  ): Promise<Note | null> {
    const entries = await this.walkVault(this.vaultDir)
    const matched = entries.find((entry) => entry.slug === slug)
    if (!matched) return null

    const embeddedImageNames = new Set<string>()
    const note = await this.readNote(slug, matched.filePath, allSlugs, nameToSlugMap, (fileName) =>
      embeddedImageNames.add(fileName),
    )
    await this.copyEmbeddedImages(embeddedImageNames)
    return note
  }

  // Design Ref: §11.2 module-1 — vault 하위 폴더를 재귀적으로 탐색해 모든 .md 파일을
  // vault 루트 기준 상대 경로 slug(폴더 세그먼트별로 slugifyNoteName 적용)로 변환한다.
  async listSlugs(): Promise<readonly string[]> {
    const entries = await this.walkVault(this.vaultDir)
    return entries.map((entry) => entry.slug)
  }

  private async readNote(
    slug: string,
    filePath: string,
    allSlugs?: ReadonlySet<string>,
    nameToSlugMap?: ReadonlyMap<string, string>,
    onImageEmbed?: (fileName: string) => void,
  ): Promise<Note | null> {
    let fileContent: string
    try {
      fileContent = await readFile(filePath, 'utf-8')
    } catch {
      return null
    }

    const { data, content } = matter(fileContent)
    const frontmatter = normalizeFrontmatter(data)
    const { html, headings } = await markdownToHtml(content, {
      allSlugs,
      sourceSlug: slug,
      nameToSlugMap,
      onImageEmbed,
    })
    const inlineTags = extractInlineTags(content)
    const tags = Array.from(new Set([...(frontmatter.tags ?? []), ...inlineTags]))
    const linkedSlugs = extractWikilinkSlugs(content, nameToSlugMap)

    return createNote({ slug, frontmatter, rawContent: content, html, tags, linkedSlugs, headings })
  }

  // Design Ref: wikilink-image-embed §2.2 — 노트 파싱 중 수집된 이미지 임베드 파일명들을
  // vault에서 찾아 public/vault-assets/로 복사한다. 찾지 못하면 경고만 남기고 계속 진행한다.
  private async copyEmbeddedImages(fileNames: ReadonlySet<string>): Promise<void> {
    if (fileNames.size === 0) return

    await mkdir(VAULT_ASSETS_DIR, { recursive: true })
    const assetEntries = await this.walkAllFiles(this.vaultDir)
    const assetPathByName = new Map<string, string>()
    for (const entry of assetEntries) {
      const name = path.basename(entry)
      if (!assetPathByName.has(name)) {
        assetPathByName.set(name, entry)
      }
    }

    await Promise.all(
      Array.from(fileNames, async (fileName) => {
        const sourcePath = assetPathByName.get(fileName)
        if (!sourcePath) {
          console.warn(`[image-embed] not found in vault: "${fileName}"`)
          return
        }
        try {
          await copyFile(sourcePath, path.join(VAULT_ASSETS_DIR, fileName))
        } catch (error) {
          console.warn(`[image-embed] failed to copy "${fileName}": ${String(error)}`)
        }
      }),
    )
  }

  // 이미지 임베드 파일 검색용 — .md를 포함한 모든 파일 경로를 재귀적으로 수집한다.
  private async walkAllFiles(dir: string): Promise<readonly string[]> {
    let dirents: Dirent[]
    try {
      dirents = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }

    const files: string[] = []
    for (const dirent of dirents) {
      const entryPath = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        files.push(...(await this.walkAllFiles(entryPath)))
      } else {
        files.push(entryPath)
      }
    }
    return files
  }

  // slug(소문자 정규화)와 실제 파일 경로(원본 대소문자 보존)를 함께 반환해야
  // 대문자가 포함된 폴더/파일명(예: 'AI', 'Image')도 정상적으로 다시 읽을 수 있다.
  private async walk(dir: string): Promise<readonly WalkEntry[]> {
    let dirents: Dirent[]
    try {
      dirents = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }

    const entries: WalkEntry[] = []
    for (const dirent of dirents) {
      const entryPath = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        const dirSlug = slugifyNoteName(dirent.name)
        const childEntries = await this.walk(entryPath)
        entries.push(
          ...childEntries.map((child) => ({
            slug: `${dirSlug}/${child.slug}`,
            filePath: child.filePath,
          })),
        )
      } else if (dirent.name.endsWith(MARKDOWN_EXTENSION)) {
        entries.push({
          slug: slugifyNoteName(path.basename(dirent.name, MARKDOWN_EXTENSION)),
          filePath: entryPath,
        })
      }
    }
    return entries
  }
}

// Design Ref: §11.2 module-2 — Obsidian 위키링크는 폴더 경로 없이 파일명만 참조하므로,
// 파일명(slugify 전) -> full slug 역매핑을 만들어 remarkWikilink가 하위 폴더 노트를
// 찾을 수 있게 한다. 동일 파일명이 여러 폴더에 있으면 첫 매칭을 사용하고 경고한다.
function buildNameToSlugMap(slugs: readonly string[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const slug of slugs) {
    const name = slug.split('/').pop() ?? slug
    if (map.has(name)) {
      console.warn(
        `[vault] duplicate note name "${name}" found at "${slug}" — wikilinks to "${name}" will resolve to "${map.get(name)}"`,
      )
      continue
    }
    map.set(name, slug)
  }
  return map
}

function normalizeFrontmatter(data: Record<string, unknown>): NoteFrontmatter {
  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    date: typeof data.date === 'string' ? data.date : undefined,
  }
}

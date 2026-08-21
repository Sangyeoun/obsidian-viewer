import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { Note, NoteFrontmatter } from '@/domain/note/Note'
import { createNote } from '@/domain/note/Note'
import type { NoteRepository } from '@/domain/note/NoteRepository'
import { markdownToHtml } from '@/infrastructure/markdown/markdownToHtml'
import { extractWikilinkSlugs, slugifyNoteName } from '@/infrastructure/markdown/remarkWikilink'
import { extractInlineTags } from '@/infrastructure/markdown/remarkHashtag'

const MARKDOWN_EXTENSION = '.md'

/**
 * FileSystemNoteRepository - 로컬 파일시스템의 Obsidian vault 폴더에서
 * 마크다운 파일을 읽어 Note 도메인 객체로 변환하는 NoteRepository 구현체.
 *
 * 빌드 타임(정적 생성)에 호출되는 것을 전제로 하며, 매 호출마다 vault 디렉터리를
 * 다시 읽는다 (요청마다 새로 읽지 않도록 상위에서 캐싱 여부를 결정한다).
 */
export class FileSystemNoteRepository implements NoteRepository {
  constructor(private readonly vaultDir: string) {}

  async findAll(): Promise<readonly Note[]> {
    const slugs = await this.listSlugs()
    const notes = await Promise.all(slugs.map((slug) => this.findBySlug(slug)))
    return notes.filter((note): note is Note => note !== null)
  }

  async findBySlug(slug: string): Promise<Note | null> {
    const filePath = path.join(this.vaultDir, `${slug}${MARKDOWN_EXTENSION}`)
    let fileContent: string
    try {
      fileContent = await readFile(filePath, 'utf-8')
    } catch {
      return null
    }

    const { data, content } = matter(fileContent)
    const frontmatter = normalizeFrontmatter(data)
    const html = await markdownToHtml(content)
    const inlineTags = extractInlineTags(content)
    const tags = Array.from(new Set([...(frontmatter.tags ?? []), ...inlineTags]))
    const linkedSlugs = extractWikilinkSlugs(content)

    return createNote({ slug, frontmatter, rawContent: content, html, tags, linkedSlugs })
  }

  private async listSlugs(): Promise<string[]> {
    let entries: string[]
    try {
      entries = await readdir(this.vaultDir)
    } catch {
      return []
    }
    return entries
      .filter((entry) => entry.endsWith(MARKDOWN_EXTENSION))
      .map((entry) => slugifyNoteName(path.basename(entry, MARKDOWN_EXTENSION)))
  }
}

function normalizeFrontmatter(data: Record<string, unknown>): NoteFrontmatter {
  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    date: typeof data.date === 'string' ? data.date : undefined,
  }
}

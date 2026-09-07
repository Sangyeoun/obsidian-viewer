import Link from 'next/link'
import { NoteContent } from '@/components/organisms/NoteContent'
import { NoteToc } from '@/components/organisms/NoteToc'
import { Tag } from '@/components/atoms/Tag'
import { DateLabel } from '@/components/atoms/DateLabel'
import { getNoteBySlug } from '@/application/vault/getNoteBySlug'
import { listNotes } from '@/application/vault/listNotes'
import { vaultRepository } from '@/application/vault/vaultRepository'
import { getNoteTitle } from '@/domain/note/Note'

interface NotePageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const notes = await listNotes(vaultRepository)
  return notes.map((note) => ({ slug: note.slug.split('/') }))
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const decodedSlug = slug.map((segment) => safeDecodeURIComponent(segment)).join('/')
  const note = await getNoteBySlug(vaultRepository, decodedSlug)

  if (!note) {
    // Design Ref: split-pane-layout §6.1 — notFound()는 (browse) layout(사이드바)까지
    // 대체해버리는 Next.js 프레임워크 제약이 있어, 사이드바를 유지한 채 중앙만
    // "찾을 수 없음" 상태로 표시한다.
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          노트를 찾을 수 없어요
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          요청한 노트가 vault에 없습니다.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-violet-600 hover:underline dark:text-violet-400"
        >
          ← 노트 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  // Design Ref: note-toc §5.1 — 헤딩이 없으면 TOC 컬럼 자체를 렌더링하지 않고
  // 본문만 있는 기존 레이아웃으로 자연스럽게 폴백한다.
  const hasToc = note.headings.length > 0

  return (
    <div className={hasToc ? 'mx-auto flex max-w-6xl gap-8' : 'mx-auto max-w-4xl'}>
      <article className={hasToc ? 'min-w-0 max-w-4xl flex-1' : undefined}>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {getNoteTitle(note)}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <DateLabel date={note.frontmatter.date} />
          </div>
          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Tag key={tag} name={tag} />
              ))}
            </div>
          )}
        </header>
        <NoteContent html={note.html} />
      </article>
      {hasToc && (
        <aside className="hidden w-56 shrink-0 lg:block">
          <NoteToc headings={note.headings} />
        </aside>
      )}
    </div>
  )
}

// 잘못된 percent-encoding(예: 파일명에 '%'가 그대로 포함된 slug)이 들어오면
// decodeURIComponent가 URIError를 던져 페이지 렌더링 자체가 죽으므로 원문으로 폴백한다.
function safeDecodeURIComponent(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

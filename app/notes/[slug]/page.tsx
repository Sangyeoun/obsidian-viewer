import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageLayout } from '@/components/templates/PageLayout'
import { NoteContent } from '@/components/organisms/NoteContent'
import { Tag } from '@/components/atoms/Tag'
import { DateLabel } from '@/components/atoms/DateLabel'
import { getNoteBySlug } from '@/application/vault/getNoteBySlug'
import { listNotes } from '@/application/vault/listNotes'
import { vaultRepository } from '@/application/vault/vaultRepository'
import { getNoteTitle } from '@/domain/note/Note'

interface NotePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const notes = await listNotes(vaultRepository)
  return notes.map((note) => ({ slug: note.slug }))
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = await getNoteBySlug(vaultRepository, slug)

  if (!note) {
    notFound()
  }

  return (
    <PageLayout>
      <Link href="/" className="text-sm text-violet-600 hover:underline dark:text-violet-400">
        ← 노트 목록
      </Link>
      <header className="mt-4 mb-6">
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
    </PageLayout>
  )
}

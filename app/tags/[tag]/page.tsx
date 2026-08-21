import Link from 'next/link'
import { PageLayout } from '@/components/templates/PageLayout'
import { NoteList } from '@/components/organisms/NoteList'
import { listNotes } from '@/application/vault/listNotes'
import { vaultRepository } from '@/application/vault/vaultRepository'

interface TagPageProps {
  params: Promise<{ tag: string }>
}

export async function generateStaticParams() {
  const notes = await listNotes(vaultRepository)
  const tags = new Set(notes.flatMap((note) => note.tags))
  return Array.from(tags).map((tag) => ({ tag }))
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params
  const notes = await listNotes(vaultRepository)
  const filtered = notes.filter((note) => note.tags.includes(tag))

  return (
    <PageLayout>
      <Link href="/" className="text-sm text-violet-600 hover:underline dark:text-violet-400">
        ← 노트 목록
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        #{tag}
      </h1>
      <NoteList notes={filtered} />
    </PageLayout>
  )
}

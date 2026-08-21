import { PageLayout } from '@/components/templates/PageLayout'
import { NoteList } from '@/components/organisms/NoteList'
import { listNotes } from '@/application/vault/listNotes'
import { vaultRepository } from '@/application/vault/vaultRepository'

export default async function HomePage() {
  const notes = await listNotes(vaultRepository)

  return (
    <PageLayout>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        노트 목록
      </h1>
      <NoteList notes={notes} />
    </PageLayout>
  )
}

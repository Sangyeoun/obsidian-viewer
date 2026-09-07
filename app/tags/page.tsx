import { PageLayout } from '@/components/templates/PageLayout'
import { TagIndexList } from '@/components/organisms/TagIndexList'
import { listNotes } from '@/application/vault/listNotes'
import { buildTagIndex } from '@/application/vault/buildTagIndex'
import { vaultRepository } from '@/application/vault/vaultRepository'

export default async function TagsPage() {
  const notes = await listNotes(vaultRepository)
  const tags = buildTagIndex(notes)

  return (
    <PageLayout>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        태그
      </h1>
      <TagIndexList tags={tags} />
    </PageLayout>
  )
}

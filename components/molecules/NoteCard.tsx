import Link from 'next/link'
import type { Note } from '@/domain/note/Note'
import { getNoteTitle } from '@/domain/note/Note'
import { Tag } from '@/components/atoms/Tag'
import { DateLabel } from '@/components/atoms/DateLabel'

interface NoteCardProps {
  readonly note: Note
}

/** NoteCard - 노트 목록에서 노트 하나를 요약해서 보여주는 카드. */
export function NoteCard({ note }: NoteCardProps) {
  const excerpt = note.rawContent.replace(/[#>[\]*_`-]/g, '').trim().slice(0, 120)

  return (
    <Link
      href={`/notes/${note.slug}`}
      className="block rounded-xl border border-neutral-200 p-5 transition hover:border-violet-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-violet-700"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {getNoteTitle(note)}
        </h2>
        <DateLabel date={note.frontmatter.date} />
      </div>
      {excerpt && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{excerpt}...</p>
      )}
      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <Tag key={tag} name={tag} />
          ))}
        </div>
      )}
    </Link>
  )
}

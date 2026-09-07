import Link from 'next/link'
import type { Note } from '@/domain/note/Note'
import { getNoteTitle } from '@/domain/note/Note'
import { DateLabel } from '@/components/atoms/DateLabel'

interface NoteListItemProps {
  readonly note: Note
  readonly isSelected: boolean
}

/** NoteListItem - 사이드바 목록에서 노트 하나를 나타내는 좁은 폭의 목록 아이템. */
export function NoteListItem({ note, isSelected }: NoteListItemProps) {
  return (
    <Link
      href={`/notes/${note.slug}`}
      aria-current={isSelected ? 'page' : undefined}
      className={`block rounded-md px-3 py-2 text-sm transition ${
        isSelected
          ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200'
          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{getNoteTitle(note)}</span>
        <DateLabel date={note.frontmatter.date} />
      </div>
    </Link>
  )
}

import type { Note } from '@/domain/note/Note'
import { NoteCard } from '@/components/molecules/NoteCard'

interface NoteListProps {
  readonly notes: readonly Note[]
}

/** NoteList - vault의 모든 노트를 카드 그리드로 나열하는 섹션. */
export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <p className="text-neutral-500 dark:text-neutral-400">
        vault 폴더에 마크다운 노트가 없습니다. vault/*.md 파일을 추가해보세요.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {notes.map((note) => (
        <NoteCard key={note.slug} note={note} />
      ))}
    </div>
  )
}

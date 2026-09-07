import Link from 'next/link'
import type { TagCount } from '@/application/vault/buildTagIndex'

interface TagIndexListProps {
  readonly tags: readonly TagCount[]
}

/** TagIndexList - vault의 전체 태그와 태그별 노트 개수를 나열하는 섹션. */
export function TagIndexList({ tags }: TagIndexListProps) {
  if (tags.length === 0) {
    return (
      <p className="text-neutral-500 dark:text-neutral-400">
        아직 등록된 태그가 없습니다.
      </p>
    )
  }

  return (
    <ul className="flex flex-wrap gap-3">
      {tags.map(({ tag, count }) => (
        <li key={tag}>
          <Link
            href={`/tags/${tag}`}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/70"
          >
            #{tag}
            <span className="text-violet-500 dark:text-violet-400">({count})</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

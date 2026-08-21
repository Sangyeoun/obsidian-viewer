import Link from 'next/link'

interface TagProps {
  readonly name: string
}

/** Tag - 노트에 붙은 태그 하나를 보여주는 작은 배지. 클릭하면 태그 페이지로 이동한다. */
export function Tag({ name }: TagProps) {
  return (
    <Link
      href={`/tags/${name}`}
      className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/70"
    >
      #{name}
    </Link>
  )
}

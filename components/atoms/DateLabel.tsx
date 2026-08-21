interface DateLabelProps {
  readonly date?: string
}

/** DateLabel - 노트의 작성 날짜를 표시한다. 날짜가 없으면 아무것도 렌더링하지 않는다. */
export function DateLabel({ date }: DateLabelProps) {
  if (!date) return null

  return (
    <time dateTime={date} className="text-sm text-neutral-500 dark:text-neutral-400">
      {date}
    </time>
  )
}

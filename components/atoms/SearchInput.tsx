interface SearchInputProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

/** SearchInput - 검색어 입력 필드. 상위 컴포넌트가 상태를 관리하는 제어 컴포넌트. */
export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="노트 제목 또는 내용 검색"
      className="w-full rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
    />
  )
}

/** EmptyNoteState - 노트를 선택하지 않은 상태에서 중앙 영역에 표시하는 안내 문구. */
export function EmptyNoteState() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        왼쪽 목록에서 노트를 선택하세요
      </p>
    </div>
  )
}

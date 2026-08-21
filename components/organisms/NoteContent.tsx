interface NoteContentProps {
  readonly html: string
}

/**
 * NoteContent - 노트 본문 HTML을 렌더링한다.
 *
 * html은 이 프로젝트의 build-time 마크다운 파이프라인(infrastructure/markdown)에서만
 * 생성되며 사용자 입력을 직접 받지 않는다. vault 파일은 프로젝트 관리자가 직접 배치하는
 * 신뢰된 콘텐츠이므로 dangerouslySetInnerHTML 사용이 허용된다.
 */
export function NoteContent({ html }: NoteContentProps) {
  return (
    <div
      className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-violet-600 dark:prose-a:text-violet-400 [&_.wikilink]:no-underline [&_.wikilink]:font-medium [&_.wikilink]:border-b [&_.wikilink]:border-violet-300 [&_.tag-link]:no-underline [&_.callout]:my-4 [&_.callout]:rounded-lg [&_.callout]:border-l-4 [&_.callout]:px-4 [&_.callout]:py-2 [&_.callout-note]:border-blue-400 [&_.callout-note]:bg-blue-50 dark:[&_.callout-note]:bg-blue-950/30 [&_.callout-tip]:border-emerald-400 [&_.callout-tip]:bg-emerald-50 dark:[&_.callout-tip]:bg-emerald-950/30 [&_.callout-warning]:border-amber-400 [&_.callout-warning]:bg-amber-50 dark:[&_.callout-warning]:bg-amber-950/30 [&_.callout-important]:border-rose-400 [&_.callout-important]:bg-rose-50 dark:[&_.callout-important]:bg-rose-950/30"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

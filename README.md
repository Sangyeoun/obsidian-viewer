# Obsidian Viewer

Obsidian vault의 마크다운 노트를 읽어서 웹 페이지로 렌더링하는 정적 뷰어.

## 사용 방법

1. `vault/` 폴더에 Obsidian 마크다운(`.md`) 파일을 넣습니다.
2. `pnpm dev`로 개발 서버를 실행하면 `vault/*.md`가 빌드 타임에 읽혀 페이지로 렌더링됩니다.
3. 파일을 추가/수정하면 서버를 재시작(또는 재빌드)해 반영합니다.

```bash
pnpm dev      # 개발 서버
pnpm build    # 정적 빌드
pnpm start    # 빌드 결과 실행
```

## 지원하는 Obsidian 문법

- 표준 마크다운 + GFM (표, 체크리스트, 취소선)
- 위키링크 `[[note-name]]`, `[[note-name|표시명]]` → `/notes/{slug}` 링크로 변환
- 콜아웃 `> [!note] 제목` (note/tip/warning/important 등)
- frontmatter (`title`, `tags`, `date`)
- 인라인 `#tag` → `/tags/{tag}` 링크로 변환

## 아키텍처

클린 아키텍처 + Atomic Design 조합:

```
domain/           # Note 엔티티, NoteRepository 인터페이스 (프레임워크 비의존)
application/       # 유스케이스 (listNotes, getNoteBySlug) + 컴포지션 루트
infrastructure/    # FileSystemNoteRepository, remark/rehype 마크다운 파이프라인
components/
  atoms/           # Tag, DateLabel
  molecules/       # NoteCard
  organisms/       # NoteList, NoteContent, SiteHeader
  templates/       # PageLayout
app/               # Next.js App Router 페이지 (/, /notes/[slug], /tags/[tag])
vault/             # Obsidian 마크다운 원본 (샘플 노트 포함)
mocks/             # 테스트/스토리용 목업 데이터
```

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (+ @tailwindcss/typography)
- gray-matter (frontmatter 파싱)
- remark / rehype (마크다운 → HTML, 위키링크/콜아웃/태그 커스텀 플러그인)

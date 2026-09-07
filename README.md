# Obsidian Viewer

Obsidian vault의 마크다운 노트를 읽어서 웹 페이지로 렌더링하는 정적 뷰어.

## 사용 방법

1. `vault/` 폴더에 Obsidian 마크다운(`.md`) 파일을 넣습니다.
2. `pnpm dev`로 개발 서버를 실행하면 `vault/*.md`가 빌드 타임에 읽혀 페이지로 렌더링됩니다.
3. 파일을 추가/수정하면 서버를 재시작(또는 재빌드)해 반영합니다.
4. vault 폴더 위치를 바꾸려면 `.env.local`에 `VAULT_DIR=./다른-폴더`를 지정합니다 (미설정 시 기본값 `vault/`).

```bash
pnpm dev      # 개발 서버
pnpm build    # 정적 빌드
pnpm start    # 빌드 결과 실행
```

## 지원하는 Obsidian 문법

- 표준 마크다운 + GFM (표, 체크리스트, 취소선)
- 위키링크 `[[note-name]]`, `[[note-name|표시명]]` → `/notes/{slug}` 링크로 변환
  (vault에 존재하지 않는 노트를 가리키면 끊긴 링크로 표시되고 빌드 로그에 경고가 남습니다)
- 콜아웃 `> [!note] 제목` (note/tip/warning/important 등)
- frontmatter (`title`, `tags`, `date`)
- 인라인 `#tag` → `/tags/{tag}` 링크로 변환

## 검색 및 태그 탐색

- 홈페이지(`/`) 상단 검색창에 입력하면 제목/본문에 매칭되는 노트만 클라이언트에서 즉시 필터링됩니다.
- `/tags`에서 전체 태그와 태그별 노트 개수를 확인할 수 있습니다.

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
app/               # Next.js App Router 페이지 (/, /notes/[slug], /tags, /tags/[tag])
vault/             # Obsidian 마크다운 원본 (샘플 노트 포함)
mocks/             # 테스트/스토리용 목업 데이터
```

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (+ @tailwindcss/typography)
- gray-matter (frontmatter 파싱)
- remark / rehype (마크다운 → HTML, 위키링크/콜아웃/태그 커스텀 플러그인)

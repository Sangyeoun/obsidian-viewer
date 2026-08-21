@AGENTS.md

# Development Workflow

## 패키지 관리

- 항상 `pnpm` 사용 (packageManager 필드로 고정됨: pnpm@11.22.0)

## 개발 순서

1. 변경 사항 작성
2. 타입체크: `pnpm typecheck`
3. 린트: `pnpm lint`
4. 빌드: `pnpm build`

## 프로젝트 개요

Obsidian vault의 마크다운(`vault/*.md`)을 빌드 타임에 읽어 정적으로 렌더링하는
Next.js 16 (App Router) 뷰어. 위키링크(`[[note]]`), 콜아웃(`> [!note]`), 인라인
`#tag`를 커스텀 remark 플러그인으로 처리한다.

## 프로젝트 구조 (클린 아키텍처 + Atomic Design)

```
domain/            # Note 엔티티, NoteRepository 인터페이스 — 프레임워크 비의존
application/        # 유스케이스(listNotes, getNoteBySlug) + 컴포지션 루트(vaultRepository)
infrastructure/     # FileSystemNoteRepository, remark/rehype 마크다운 파이프라인
components/
  atoms/            # Tag, DateLabel
  molecules/        # NoteCard
  organisms/        # NoteList, NoteContent, SiteHeader
  templates/        # PageLayout
app/                # Next.js 라우트 (/, /notes/[slug], /tags/[tag])
vault/              # Obsidian 마크다운 원본
mocks/              # 테스트/스토리용 목업 데이터
```

## 의존 방향

`app` → `application` → `domain`
`infrastructure`는 `domain`의 인터페이스를 구현하고, `application`의 컴포지션 루트
(`application/vault/vaultRepository.ts`)에서만 구체 클래스를 선택한다.
`domain`은 다른 레이어를 절대 import하지 않는다.

## 코딩 컨벤션

- `type` 선호, `interface`는 포트(Repository)나 다중 구현이 예상되는 경우에만 사용
- 불변 객체: 도메인 객체는 필드 변경 대신 새 객체 생성 (createNote 참고)
- 마크다운 커스텀 문법 추가 시 `infrastructure/markdown/`에 remark 플러그인으로 구현

## 금지 사항

- ❌ `vault/` 외부에서 사용자 입력을 그대로 HTML로 렌더링 (NoteContent는 신뢰된
  build-time 콘텐츠만 처리하도록 설계됨 — 이 전제를 깨는 변경 금지)
- ❌ `domain`에서 Next.js/React/파일시스템 API import

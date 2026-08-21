---
name: obsidian-viewer-architecture
description: 이 프로젝트의 클린 아키텍처 + Atomic Design 구조와 의존 방향. 새 기능 추가, 레이어 간 배치, 폴더 구조 관련 작업 시 사용.
---

# obsidian-viewer 아키텍처

## 레이어와 의존 방향

```
app/  →  application/  →  domain/
              ↑
       infrastructure/ (domain의 인터페이스를 구현)
```

- `domain/note/Note.ts` — Note 엔티티(불변), `NoteRepository.ts` — 포트 인터페이스.
  이 폴더는 Next.js/React/Node fs 등 어떤 것도 import하지 않는다.
- `application/vault/` — 유스케이스(`listNotes`, `getNoteBySlug`)와 컴포지션 루트
  (`vaultRepository.ts`, 여기서만 `FileSystemNoteRepository`를 생성해 export한다).
  app/ 레이어는 항상 `vaultRepository`를 통해서만 데이터에 접근한다.
- `infrastructure/filesystem/FileSystemNoteRepository.ts` — `NoteRepository` 구현체.
  `vault/*.md`를 읽고 gray-matter로 frontmatter 파싱 후 Note로 변환한다.
- `infrastructure/markdown/` — remark/rehype 파이프라인.
  - `remarkWikilink.ts` — `[[note]]` → `/notes/{slug}` 링크
  - `remarkCallout.ts` — `> [!type] 제목` → `.callout .callout-{type}` blockquote
  - `remarkHashtag.ts` — 인라인 `#tag` → `/tags/{tag}` 링크
  - `markdownToHtml.ts` — 위 플러그인들을 조합한 파이프라인 진입점

## Atomic Design (components/)

atoms(Tag, DateLabel) → molecules(NoteCard) → organisms(NoteList, NoteContent,
SiteHeader) → templates(PageLayout). 상위 레벨만 하위 레벨을 조합해서 쓴다.

## 새 Obsidian 문법을 추가할 때

1. `infrastructure/markdown/`에 새 remark 플러그인 파일 추가 (기존 3개 패턴 참고)
2. `markdownToHtml.ts`의 `.use()` 체인에 등록
3. 필요시 `NoteContent.tsx`의 tailwind 클래스에 렌더링 스타일 추가

## 새 페이지/라우트를 추가할 때

`app/`에 라우트를 만들고, 데이터는 `application/vault/`의 기존 유스케이스를 재사용하거나
새 유스케이스를 `application/vault/`에 추가한다. `app/`에서 `infrastructure/`를
직접 import하지 않는다.

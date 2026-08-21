---
name: obsidian-viewer-testing
description: 이 프로젝트의 테스트 현황과 목업 데이터 사용법. 테스트 추가/실행 관련 작업 시 사용.
---

# obsidian-viewer 테스트

## 현재 상태

테스트 러너(vitest/jest 등)가 아직 설정되어 있지 않다. 검증은 현재
`pnpm typecheck`, `pnpm lint`, `pnpm build`(정적 생성 성공 여부)로 대체하고 있다.

## 테스트를 추가하게 될 경우

- 목업 데이터는 새로 만들지 말고 `mocks/note.fixture.ts`의 `mockNote`, `mockNotes`를
  재사용한다.
- 우선순위가 높은 단위 테스트 대상:
  - `infrastructure/markdown/remarkWikilink.ts` — `extractWikilinkSlugs`,
    `slugifyNoteName`
  - `infrastructure/markdown/remarkHashtag.ts` — `extractInlineTags`
  - `application/vault/listNotes.ts` — 날짜 정렬 로직 (date 없는 노트 처리 포함)
- 통합 테스트 대상: `FileSystemNoteRepository` (임시 vault 폴더를 만들어 검증)
- E2E: 노트 목록 → 노트 상세 → 위키링크 클릭 → 다른 노트로 이동하는 흐름

## 수동 검증 방법 (테스트 인프라 도입 전)

```bash
pnpm build
# 생성된 정적 HTML에서 커스텀 문법이 렌더링됐는지 확인
grep -o 'callout[a-z-]*' .next/server/app/notes/{slug}.html | sort -u
grep -o 'wikilink' .next/server/app/notes/{slug}.html
```

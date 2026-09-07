---
template: design
version: 1.3
description: PDCA Design phase document template with Context Anchor, Session Guide, and Clean Architecture support
variables:
  - feature: note-toc
  - date: 2026-09-07
  - author: SY LEE
  - project: obsidian-viewer
  - version: 0.1.0
---

# note-toc Design Document

> **Summary**: 노트 상세 페이지 우측 빈 공간에, 본문의 헤딩을 파싱한 목차(TOC)를 sticky 패널로 표시한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-07
> **Status**: Draft
> **Planning Doc**: [note-toc.plan.md](../01-plan/features/note-toc.plan.md)

### Pipeline References (if applicable)

N/A — 이 프로젝트는 9-phase Development Pipeline을 사용하지 않는다.

---

## Context Anchor

> Copied from Plan document.

| Key | Value |
|-----|-------|
| **WHY** | 노트 상세 페이지 우측 공간이 비어 있고, 긴 문서에서 섹션 탐색 수단이 없음 |
| **WHO** | vault 노트를 읽는 뷰어 사용자 (본인 및 노트 공유 대상) |
| **RISK** | 헤딩이 없는 노트/헤딩이 매우 많은 노트에서 레이아웃이 어색해질 수 있음 |
| **SUCCESS** | H1~H4 헤딩이 우측 패널에 목차로 표시되고, 클릭 시 해당 섹션으로 스크롤되며, 스크롤 중 현재 섹션이 하이라이트됨 |
| **SCOPE** | 목차 데이터 추출(인프라) → 우측 패널 컴포넌트(UI) → 액티브 하이라이트(클라이언트 인터랙션), 총 1 phase |

---

## 1. Overview

### 1.1 Design Goals

- 기존 remark 마크다운 파이프라인에 헤딩 추출 플러그인을 추가해 `Note.headings`를 빌드 타임에 채운다.
- `rehype-slug`(내부적으로 `github-slugger` 사용)와 동일한 슬러그 시퀀스를 재현해 TOC 링크와 본문 헤딩 `id`를 100% 일치시킨다.
- 노트 상세 페이지를 3단(사이드바 / 본문 / TOC) 레이아웃으로 확장하되, 헤딩이 없는 노트에서는 TOC 컬럼 자체를 렌더링하지 않는다.

### 1.2 Design Principles

- **재사용 우선**: 새 슬러그 알고리즘을 직접 구현하지 않고, `rehype-slug`가 실제로 사용하는 `github-slugger`를 그대로 사용한다.
- **관심사 분리**: 헤딩 파싱(인프라) / 목차 도메인 데이터(도메인) / 렌더링·인터랙션(UI)을 분리하되, 이 프로젝트 규모에 맞게 과도한 계층 신설은 피한다.
- **점진적 열화(graceful degradation)**: 헤딩이 없으면 TOC 없이 기존 2단 레이아웃과 동일하게 보인다.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | rawContent 정규식 파싱, NoteContent에 로직 직접 삽입 | application 유스케이스(`buildTableOfContents`)로 분리, atoms/molecules/organisms 세분화 | remark 플러그인으로 파싱, NoteToc organism 하나로 렌더링 |
| **New Files** | 0 | 5 | 2 |
| **Modified Files** | 4 | 5 | 4 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium (정규식이 코드블록 내부 `#` 오탐 가능) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Medium (코드블록 오탐, id 불일치 가능성) | Low (구조 명확하나 과설계) | Low (균형) |
| **Recommendation** | Quick wins | Long-term, 대규모 팀 | **Default choice** |

**Selected**: Option C — Pragmatic Balance
**Rationale**: 이미 remark 파이프라인(`remarkWikilink`, `remarkCallout`, `remarkHashtag`)이 존재하므로 동일 패턴의 신규 플러그인(`remarkExtractHeadings`) 추가가 가장 자연스럽다. mdast 트리에서 `heading` 노드만 순회하므로 코드블록 내부의 `#`(예: 쉘 스크립트 주석)을 헤딩으로 오인하지 않는다. TOC 렌더링은 이 프로젝트 규모(단일 사용자 뷰어)에서 atoms/molecules로 더 쪼갤 필요 없이 `NoteToc` organism 하나로 충분하다.

> The detailed design below follows Option C.

### 2.1 Component Diagram

```
                    ┌─────────────────────────────┐
                    │ FileSystemNoteRepository     │
                    │  .readNote()                 │
                    └──────────────┬───────────────┘
                                   │ markdown
                                   ▼
                    ┌─────────────────────────────┐
                    │ markdownToHtml()             │
                    │  remark()                    │
                    │   .use(remarkGfm)             │
                    │   .use(remarkWikilink)        │
                    │   .use(remarkCallout)         │
                    │   .use(remarkHashtag)         │
                    │   .use(remarkExtractHeadings) │◄─ 신규, headings 옵션 객체에 수집
                    │   .use(remarkRehype)          │
                    │   .use(rehypeSlug)             │  (본문 id 부여, 기존 그대로)
                    │   .use(rehypeStringify)        │
                    └──────────────┬───────────────┘
                                   │ html + headings[]
                                   ▼
                    ┌─────────────────────────────┐
                    │ createNote({ ..., headings }) │
                    └──────────────┬───────────────┘
                                   │ Note
                                   ▼
        ┌──────────────────────────────────────────────┐
        │ app/(browse)/notes/[...slug]/page.tsx         │
        │  ┌───────────┐ ┌─────────────┐ ┌────────────┐│
        │  │ Sidebar   │ │ NoteContent │ │  NoteToc   ││
        │  │ (기존)     │ │ (기존)       │ │ (신규)      ││
        │  └───────────┘ └─────────────┘ └────────────┘│
        └──────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
rawContent(markdown)
  → remarkExtractHeadings: mdast heading 노드 순회 (depth 1~4만)
  → { depth, text, id }[] 수집 (github-slugger로 id 생성, 카운터 공유)
  → markdownToHtml() 리턴값에 headings 포함
  → FileSystemNoteRepository.readNote()가 createNote()에 headings 전달
  → Note.headings
  → NotePage(page.tsx)가 NoteToc에 headings prop 전달
  → NoteToc: 클릭 시 앵커 이동, IntersectionObserver로 현재 섹션 하이라이트
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `remarkExtractHeadings` | `github-slugger`, `unist-util-visit` | 헤딩 파싱 및 `rehype-slug`와 동일한 id 생성 |
| `markdownToHtml` | `remarkExtractHeadings` | 파이프라인에 플러그인 추가, 결과에 `headings` 포함 |
| `FileSystemNoteRepository.readNote` | `markdownToHtml`의 반환값 | `Note.headings` 채움 |
| `NoteToc` (organism) | `Note.headings` | TOC 렌더링, 클릭 이동, 스크롤 하이라이트 |
| `app/(browse)/notes/[...slug]/page.tsx` | `NoteToc` | 3단 레이아웃 조립 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// domain/note/Note.ts

export interface NoteHeading {
  /** 헤딩 레벨 (1~4). H5, H6은 수집하지 않는다 (Plan §2.1 In Scope). */
  readonly depth: 1 | 2 | 3 | 4
  /** 헤딩 텍스트 (인라인 마크업 제거된 순수 텍스트). */
  readonly text: string
  /** rehype-slug와 동일한 규칙(github-slugger)으로 생성된 앵커 id. 본문 heading의 id와 일치. */
  readonly id: string
}

export interface Note {
  readonly slug: string
  readonly frontmatter: NoteFrontmatter
  readonly rawContent: string
  readonly html: string
  readonly tags: readonly string[]
  readonly linkedSlugs: readonly string[]
  /** 본문에서 추출한 목차 데이터 (H1~H4). 헤딩이 없으면 빈 배열. */
  readonly headings: readonly NoteHeading[]
}
```

`createNote` 파라미터에 `headings: readonly NoteHeading[]`를 추가한다 (필수 필드, 빈 배열 허용).

### 3.2 Entity Relationships

```
Note 1 ──── N NoteHeading   (한 노트가 여러 헤딩을 가짐, 값 객체이므로 별도 저장소 없음)
```

### 3.3 Database Schema (if applicable)

N/A — 이 프로젝트는 빌드 타임에 파일시스템에서 읽어 정적 렌더링하며 DB를 사용하지 않는다.

---

## 4. API Specification

N/A — 이 프로젝트는 API 서버가 없는 정적 사이트(SSG)다. 모든 데이터는 빌드 타임에 `NoteRepository`를 통해 조회된다.

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────┬──────────────────────────────┬────────────┐
│          │                              │            │
│ Sidebar  │  NoteContent (article)       │  NoteToc   │
│ (기존,    │  (기존 max-w 유지)             │  (신규,     │
│  w-72)   │                              │   w-56,    │
│          │                              │   sticky)  │
│          │                              │            │
└──────────┴──────────────────────────────┴────────────┘
  헤딩이 없는 노트에서는 우측 컬럼이 렌더링되지 않고 2단 레이아웃으로 폴백
```

### 5.2 User Flow

```
노트 상세 페이지 진입 → (헤딩 있으면) 우측에 TOC 표시
→ TOC 항목 클릭 → 해당 헤딩으로 스크롤 이동
→ 본문 스크롤 → IntersectionObserver가 현재 보이는 헤딩 감지 → TOC에서 해당 항목 강조
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `NoteToc` | `components/organisms/NoteToc.tsx` | headings prop을 받아 sticky nav 렌더링, 클라이언트 사이드에서 IntersectionObserver로 액티브 항목 추적 |

### 5.4 Page UI Checklist (v2.1.0)

#### 노트 상세 페이지 (`app/(browse)/notes/[...slug]/page.tsx`)

- [ ] TOC 패널: `note.headings.length > 0`일 때만 렌더링 (우측, `sticky top-*`, 세로 스크롤 가능)
- [ ] TOC 항목: 각 헤딩의 `depth`에 따라 들여쓰기 차등 적용 (H1 없음/최상위, H2 기본, H3/H4 들여쓰기 증가)
- [ ] TOC 항목: 텍스트는 `NoteHeading.text`, 클릭 시 `href="#{id}"`로 이동
- [ ] TOC 항목: 현재 스크롤 위치에 해당하는 헤딩의 항목에 강조 스타일(예: 텍스트 색상/굵기 변경) 적용
- [ ] 헤딩 없는 노트: 우측 컬럼 자체가 렌더링되지 않고 본문 컬럼이 기존 폭 그대로 표시

---

## 6. Error Handling

### 6.1 Error Code Definition

N/A — 클라이언트 렌더링 실패 케이스가 없는 정적 콘텐츠 기능. 예외적으로 아래 엣지 케이스만 처리한다.

| Case | Handling |
|------|----------|
| 헤딩이 하나도 없는 노트 | `headings: []` → `NoteToc`을 아예 렌더링하지 않음 (FR-06) |
| 동일 텍스트의 헤딩이 여러 개 (예: "개요"가 2번 등장) | `github-slugger`의 기본 동작(두 번째부터 `-1`, `-2` 접미사)을 그대로 사용해 `rehype-slug`와 동일하게 처리 |
| H5/H6 헤딩 존재 | TOC 데이터 수집 시 depth 5, 6은 건너뜀 (In Scope: H1~H4만) |

### 6.2 Error Response Format

N/A

---

## 7. Security Considerations

- [x] Input validation: N/A — 사용자 입력이 아닌 빌드 타임 vault 마크다운만 처리 (CLAUDE.md 금지 사항: vault 외부 사용자 입력을 HTML로 렌더링하지 않음 원칙 유지, 본 기능은 vault 내부 콘텐츠만 다룸)
- [x] XSS 방지: TOC 텍스트는 `text-only` 노드에서 추출하며 `dangerouslySetInnerHTML` 등 raw HTML 삽입 없이 React 텍스트 노드로 렌더링
- [ ] Authentication/Authorization: N/A (인증 없는 정적 뷰어)
- [ ] HTTPS enforcement: N/A (배포 인프라 영역, 이 기능과 무관)

---

## 8. Test Plan (v2.3.0)

이 프로젝트는 별도 테스트 러너가 아직 설정되지 않았다 (`obsidian-viewer-testing` 스킬 참고). L1/L2/L3 자동화 테스트 대신, Do phase에서 아래 시나리오를 수동 검증하고 Check phase에서 재확인한다.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| 단위 검증 | `remarkExtractHeadings`가 mdast에서 H1~H4만 올바른 id로 추출하는지 | 수동 스크립트 실행 또는 임시 테스트 노트 빌드 | Do |
| UI 검증 | TOC 클릭 이동, 스크롤 하이라이트, 헤딩 없는 노트 폴백 | 브라우저 수동 확인 (`pnpm build && pnpm start` 또는 `pnpm dev`) | Do |
| 회귀 검증 | 기존 위키링크/콜아웃/해시태그 렌더링 및 헤딩 id(rehype-slug)가 TOC id와 일치하는지 | `pnpm build` 후 정적 HTML의 heading id와 TOC href 비교 | Check |

### 8.2 L1: API Test Scenarios

N/A — API 서버 없음.

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | 노트 상세 (H1~H4 포함 노트) | 페이지 로드 | 우측에 TOC 패널 표시, 헤딩 목록과 일치 | `Note.headings`와 렌더링된 TOC 항목 수 일치 |
| 2 | 노트 상세 | TOC 항목 클릭 | 해당 헤딩으로 스크롤 이동 | URL 해시가 `#{id}`로 변경, 뷰포트에 해당 헤딩 노출 |
| 3 | 노트 상세 (긴 문서) | 스크롤 | 현재 보이는 섹션의 TOC 항목이 강조됨 | 강조된 항목의 `id`가 뷰포트 상단 근처 헤딩과 일치 |
| 4 | 노트 상세 (헤딩 없는 노트) | 페이지 로드 | 우측 TOC 컬럼 미표시, 본문이 넓게 표시 | DOM에 `NoteToc` 관련 엘리먼트 없음 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 목차 탐색 | 홈 → 헤딩 많은 노트 진입 → TOC에서 3번째 항목 클릭 → 스크롤 확인 → 아래로 수동 스크롤 → TOC 하이라이트 이동 확인 | 클릭 이동과 스크롤 하이라이트 모두 정상 동작 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| vault 노트 (H1~H4 혼합 헤딩 5개 이상) | 1개 | 중복 텍스트 헤딩 1쌍 포함 (id 접미사 검증용) |
| vault 노트 (헤딩 없음) | 1개 | 본문에 헤딩 마크업 없음 (폴백 검증용) |

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Domain** | `NoteHeading` 타입, `Note.headings` 필드 | `domain/note/Note.ts` |
| **Application** | 없음 — 헤딩 데이터는 `Note`에 이미 포함되어 별도 유스케이스 불필요 | - |
| **Infrastructure** | 헤딩 추출 remark 플러그인, `Note` 생성 시 연동 | `infrastructure/markdown/remarkExtractHeadings.ts`, `infrastructure/filesystem/FileSystemNoteRepository.ts` |
| **Presentation** | TOC 렌더링 및 인터랙션 | `components/organisms/NoteToc.tsx`, `app/(browse)/notes/[...slug]/page.tsx` |

### 9.2 Dependency Rules

기존 프로젝트 규칙(`app → application → domain`, `infrastructure`는 `domain` 인터페이스 구현)을 그대로 따른다. 본 기능은 `application` 레이어에 신규 파일을 추가하지 않는다 — `Note.headings`는 `infrastructure`에서 채워진 값을 `app`이 그대로 소비하는 구조로, 기존 `Note.tags`/`Note.linkedSlugs` 처리 방식과 동일하다.

### 9.3 File Import Rules

기존 프로젝트 규칙 그대로 적용 (`domain`은 외부 비의존, `infrastructure`는 `domain`만 import, `app`은 `application`/`domain` 경유).

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `NoteHeading` | Domain | `domain/note/Note.ts` |
| `remarkExtractHeadings` | Infrastructure | `infrastructure/markdown/remarkExtractHeadings.ts` |
| `markdownToHtml` (수정) | Infrastructure | `infrastructure/markdown/markdownToHtml.ts` |
| `FileSystemNoteRepository.readNote` (수정) | Infrastructure | `infrastructure/filesystem/FileSystemNoteRepository.ts` |
| `NoteToc` | Presentation (organism) | `components/organisms/NoteToc.tsx` |
| `NotePage` (수정) | Presentation (app route) | `app/(browse)/notes/[...slug]/page.tsx` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| remark 플러그인 함수 | camelCase, `remark` 접두사 | `remarkExtractHeadings` (기존 `remarkWikilink`, `remarkCallout`, `remarkHashtag`와 동일 패턴) |
| 도메인 타입 | PascalCase | `NoteHeading` |
| 컴포넌트 | PascalCase.tsx | `NoteToc.tsx` |

### 10.2 Import Order

기존 파일들(`remarkWikilink.ts` 등)과 동일한 순서 준수: 외부 라이브러리 → 내부 절대경로(`@/...`) → 타입 임포트.

```typescript
// 1. External libraries
import { visit } from 'unist-util-visit'
import GithubSlugger from 'github-slugger'

// 2. Types
import type { Root, Heading, Text } from 'mdast'
```

### 10.3 Environment Variables

없음 — 이 기능은 신규 환경변수를 사용하지 않는다.

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | 기존 `NoteContent`, `NoteSidebar`와 동일하게 `Note` 접두사 + 역할명 (`NoteToc`) |
| File organization | `components/organisms/`에 배치 (사이드바/본문과 동일 레벨의 페이지 구성 요소) |
| State management | `NoteToc` 내부 로컬 `useState` (activeId) — 전역 상태 불필요 |
| Error handling | 없음 — 헤딩 없음은 에러가 아니라 정상 케이스(빈 배열)로 처리 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
domain/note/
  Note.ts                          # 수정: NoteHeading 타입 + Note.headings 필드 추가

infrastructure/markdown/
  remarkExtractHeadings.ts         # 신규: heading mdast 노드 수집 플러그인
  markdownToHtml.ts                # 수정: remarkExtractHeadings 연결, headings 반환

infrastructure/filesystem/
  FileSystemNoteRepository.ts      # 수정: markdownToHtml 결과의 headings를 createNote에 전달

components/organisms/
  NoteToc.tsx                      # 신규: sticky TOC 패널 (client component)

app/(browse)/notes/[...slug]/
  page.tsx                         # 수정: 3단 레이아웃, NoteToc 조건부 렌더링

mocks/
  note.fixture.ts                  # 수정: headings 필드 추가 (타입 에러 방지)

package.json                       # 수정: github-slugger 정식 의존성 추가 (현재 rehype-slug의 전이 의존성으로만 존재)
```

### 11.2 Implementation Order

1. [ ] `package.json`에 `github-slugger` 의존성 명시 추가 (버전은 `rehype-slug@^6.0.0`이 사용하는 `^2.0.0` 계열과 맞춤)
2. [ ] `domain/note/Note.ts`에 `NoteHeading` 타입과 `Note.headings` 필드, `createNote` 파라미터 추가
3. [ ] `infrastructure/markdown/remarkExtractHeadings.ts` 작성 — mdast `heading` 노드 순회(depth 1~4), 텍스트 추출(중첩 인라인 노드 flatten), `GithubSlugger` 인스턴스로 id 생성, 옵션으로 전달받은 콜백에 각 헤딩 push
4. [ ] `markdownToHtml.ts`에 `remarkExtractHeadings` 플러그인 연결, 반환 타입을 `{ html: string, headings: NoteHeading[] }`로 확장 (기존 `Promise<string>` 반환 시그니처 변경 — 호출부 1곳 확인 필요)
5. [ ] `FileSystemNoteRepository.readNote`에서 `markdownToHtml` 반환값의 `headings`를 `createNote`에 전달
6. [ ] `mocks/note.fixture.ts`에 `headings` 필드 추가 (타입체크 통과 목적)
7. [ ] `components/organisms/NoteToc.tsx` 작성 — `'use client'`, headings prop, `IntersectionObserver`로 activeId 추적, `nav` + `ul` 마크업, `sticky top-*` 배치
8. [ ] `app/(browse)/notes/[...slug]/page.tsx` 수정 — `note.headings.length > 0`일 때만 우측 컬럼에 `NoteToc` 렌더링, flex 레이아웃에 3번째 컬럼 추가
9. [ ] `pnpm typecheck && pnpm lint && pnpm build`로 검증

### 11.3 Session Guide

> Auto-generated from Design structure. Session split is recommended, not required.
> Use `/pdca do note-toc --scope module-N` to implement one module per session.

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 헤딩 추출 파이프라인 | `module-1` | `github-slugger` 의존성 추가, `NoteHeading` 도메인 타입, `remarkExtractHeadings` 플러그인, `markdownToHtml`/`FileSystemNoteRepository` 연동, mocks 갱신 | 15-20 |
| TOC UI 및 페이지 통합 | `module-2` | `NoteToc` 컴포넌트(클릭 이동 + IntersectionObserver 하이라이트), 노트 상세 페이지 3단 레이아웃 적용 | 15-20 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1` | 15-20 |
| Session 3 | Do | `--scope module-2` | 15-20 |
| Session 4 | Check + Report | 전체 | 15-20 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-07 | Initial draft — Option C (Pragmatic Balance) 선택 | SY LEE |

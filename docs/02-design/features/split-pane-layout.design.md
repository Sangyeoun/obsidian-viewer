---
template: design
version: 1.3
---

# split-pane-layout Design Document

> **Summary**: Next.js Route Group으로 `/`와 `/notes/[...slug]`가 좌측 사이드바 레이아웃을 공유하게 하고, 노트 클릭은 클라이언트 네비게이션으로 중앙 영역만 갱신한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-04
> **Status**: Draft
> **Planning Doc**: [split-pane-layout.plan.md](../01-plan/features/split-pane-layout.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 노트 클릭 시 전체 페이지 이동이 일어나 목록과 본문을 동시에 볼 수 없다. |
| **Solution** | `app/(browse)/layout.tsx` Route Group으로 `/`와 `/notes/[...slug]`를 하나의 레이아웃 아래 묶어 좌측 사이드바(검색+목록)를 공유하고, 중앙(`children`)만 페이지별로 바뀌게 한다. |
| **Function/UX Effect** | 노트 클릭 시 Next.js 클라이언트 네비게이션으로 좌측 목록은 유지된 채 중앙만 갱신되며 URL도 `/notes/{slug}`로 정상 반영된다. |
| **Core Value** | 여러 노트를 빠르게 탐색할 수 있어 뷰어의 핵심 사용성이 개선된다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 현재 목록↔상세 페이지 전환 방식은 매번 전체 페이지가 바뀌어 목록 컨텍스트를 잃고, 여러 노트를 연속으로 훑어보기 불편함 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) — 자신의 Obsidian vault를 빠르게 탐색하려는 목적 |
| **RISK** | 기존 `/notes/[...slug]` 라우트와 새 2단 레이아웃 상태(선택된 노트) 간 동기화가 깨지면 URL 직접 진입/새로고침 시 잘못된 화면이 보일 수 있음 |
| **SUCCESS** | `/`에서 좌측 목록 클릭 시 중앙에 해당 노트가 렌더링되고 URL이 `/notes/{slug}`로 바뀌며, 그 URL로 직접 진입해도 동일한 2단 레이아웃 + 해당 노트가 보임 |
| **SCOPE** | 홈 라우트(`/`)와 노트 상세 라우트(`/notes/[...slug]`)를 하나의 공유 레이아웃으로 통합. 태그 인덱스(`/tags`)는 이번 범위에서 제외 |

---

## 1. Overview

### 1.1 Design Goals

- Next.js App Router의 표준 기능(Route Group, 중첩 layout, 클라이언트 `<Link>` 네비게이션)만으로 2단 레이아웃과 부분 갱신을 구현한다.
- URL(slug)이 여전히 유일한 진실 소스(source of truth)여야 하며, 별도의 전역 상태 관리 라이브러리를 도입하지 않는다.
- `/tags` 등 이번 범위 밖의 라우트는 기존 `PageLayout`을 그대로 사용해 영향받지 않는다.

### 1.2 Design Principles

- URL 기반 상태: "어떤 노트가 선택되었는가"는 오직 URL(`/` vs `/notes/{slug}`)로 결정한다.
- 레이아웃과 페이지의 관심사 분리: `layout.tsx`(사이드바, 항상 유지) vs `page.tsx`(중앙 콘텐츠, 라우트별로 교체)
- 기존 Atomic Design 계층 유지: 사이드바 내부도 atoms/molecules/organisms 재사용

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 각 페이지에 사이드바 마크업 복사 | Parallel Routes(@sidebar, @content) | Route Group + 공유 layout.tsx |
| **New Files** | 0 | 5+ | 3 |
| **Modified Files** | 2 (중복 코드 증가) | 4 | 3 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low (사이드바 로직 중복) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | High (원래 문제 재발 — 노트 이동 시 전체 리렌더) | Low | Low |
| **Recommendation** | 비권장 | 현재 단순 2단 구조 대비 과잉 | **Default choice** |

**Selected**: Option C — **Rationale**: Next.js Route Group(`(browse)`)과 중첩 `layout.tsx`만으로 "사이드바는 유지, 중앙만 교체"라는 요구를 표준 방식으로 달성할 수 있다. Parallel Routes(Option B)는 사이드바와 본문이 서로 다른 데이터를 독립적으로 스트리밍해야 하는 경우에 적합하지만, 이 프로젝트는 둘 다 동일한 `listNotes()` 결과를 공유하는 단순 구조라 과설계다.

### 2.1 Component Diagram

```
app/(browse)/layout.tsx
  ├─ listNotes(vaultRepository)  (Server Component, 데이터 페칭)
  ├─ NoteSidebar (Client Component)
  │    ├─ SearchInput (기존 atom 재사용)
  │    ├─ NoteListItem[] (신규 molecule — 사이드바용 목록 아이템)
  │    └─ usePathname()으로 현재 선택 slug 판단 → 강조 표시
  └─ {children}  <- app/(browse)/page.tsx 또는 app/(browse)/notes/[...slug]/page.tsx

app/(browse)/page.tsx           → EmptyNoteState (신규 atom/molecule, "노트를 선택하세요")
app/(browse)/notes/[...slug]/page.tsx → 기존 NoteContent 등 그대로, PageLayout만 제거
```

### 2.2 Data Flow

```
사용자가 사이드바에서 노트 클릭
  → <Link href="/notes/{slug}"> 클라이언트 네비게이션 (Next.js App Router)
  → URL 변경, layout.tsx는 리마운트되지 않고 유지(사이드바 상태 보존)
  → app/(browse)/notes/[...slug]/page.tsx만 새로 렌더링되어 children 자리 교체
  → NoteSidebar는 usePathname()이 바뀐 것을 감지해 강조 표시만 갱신
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `app/(browse)/layout.tsx` | `listNotes`, `vaultRepository`, `NoteSidebar` | 사이드바에 필요한 전체 노트 목록을 서버에서 페칭해 클라이언트 컴포넌트에 prop으로 전달 |
| `NoteSidebar` | `next/navigation` (`usePathname`), `SearchInput`, `NoteListItem` | 클라이언트 검색 상태 관리 + 현재 선택 강조 |
| `NoteListItem` | `next/link`, `Note` 타입 | 목록 아이템 1건의 링크 + 강조 스타일 |

---

## Detailed Design

> 아래 §3~§9에서 데이터 모델, UI, 에러 처리, 보안, 테스트, 아키텍처 배치를 상세히 다룬다.

---

## 3. Data Model

### 3.1 Entity Definition

`Note` 도메인 엔티티는 변경 없음. 이번 기능은 순수 프레젠테이션 레이어 변경이다.

### 3.2 신규 개념: 선택 상태 판단

```typescript
// NoteSidebar 내부, 전역 상태 없이 URL로부터 파생
const pathname = usePathname()              // 예: '/notes/도메인/전력-단위'
const selectedSlug = pathname.startsWith('/notes/')
  ? decodeURIComponent(pathname.slice('/notes/'.length))
  : null
```

---

## 4. API Specification

해당 없음 (정적 파일 기반, 클라이언트 상태만 존재).

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│  SiteHeader (기존 유지, 전체 폭)                          │
├───────────────────┬─────────────────────────────────────┤
│  NoteSidebar       │  중앙 콘텐츠 영역                     │
│  ┌───────────────┐ │                                     │
│  │ SearchInput   │ │   (/)  EmptyNoteState                │
│  └───────────────┘ │        "왼쪽에서 노트를 선택하세요"    │
│  ▸ 노트 A (선택됨) │                                     │
│  ▸ 노트 B          │   (/notes/{slug}) NoteContent        │
│  ▸ 노트 C          │        제목 / 날짜 / 태그 / 본문       │
│  ...               │                                     │
│  (스크롤 가능)      │  (스크롤 가능, 별도 스크롤 컨테이너)    │
└───────────────────┴─────────────────────────────────────┘
```

### 5.2 User Flow

```
/ 진입 → 좌측 목록 로드 + 중앙 EmptyNoteState
  → 목록에서 노트 클릭 → URL: /notes/{slug} → 중앙 NoteContent로 교체(좌측 유지)
  → 다른 노트 클릭 → 중앙만 다시 교체
  → 검색어 입력 → 좌측 목록만 필터링(선택된 노트가 필터에서 사라져도 중앙 콘텐츠는 유지)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `BrowseLayout` | `app/(browse)/layout.tsx` | 서버에서 노트 목록 페칭, `NoteSidebar` + `{children}` 배치 |
| `NoteSidebar` | `components/organisms/NoteSidebar.tsx` | 검색 상태 관리, 필터링된 목록 렌더링, 현재 선택 판단 (Client Component) |
| `NoteListItem` | `components/molecules/NoteListItem.tsx` | 사이드바 목록의 아이템 1건 (제목, 날짜, 선택 강조) — 기존 `NoteCard`는 카드형이라 사이드바 폭에 부적합해 신규 추가 |
| `EmptyNoteState` | `components/atoms/EmptyNoteState.tsx` | 노트 미선택 시 중앙 안내 문구 |

### 5.4 Page UI Checklist

#### `/` (노트 미선택)

- [ ] 좌측: SearchInput
- [ ] 좌측: 전체 노트 목록(NoteListItem), 스크롤 가능
- [ ] 중앙: EmptyNoteState — "왼쪽 목록에서 노트를 선택하세요" 안내 문구

#### `/notes/{slug}` (노트 선택됨)

- [ ] 좌측: 동일한 SearchInput + 목록, 현재 slug에 해당하는 아이템이 강조(배경색/폰트weight 등) 표시
- [ ] 중앙: 기존 `NotePage`와 동일한 제목/날짜/태그/`NoteContent` 렌더링
- [ ] 좌측에서 다른 노트 클릭 시 페이지 전체 새로고침 없이 중앙만 교체

#### `/tags`, `/tags/[tag]` (회귀 확인용, 변경 없음)

- [ ] 기존과 동일하게 단일 컬럼 `PageLayout` 유지, 사이드바 없음

---

## 6. Error Handling

### 6.1 Error Case 정의

| Case | 원인 | 처리 |
|------|------|------|
| 존재하지 않는 slug로 `/notes/{slug}` 직접 진입 | 오타, 삭제된 노트, 끊긴 외부 링크 | 기존 `NotePage`의 `notFound()` 로직 그대로 유지 — 레이아웃은 정상 표시되고 중앙만 404 |
| vault에 노트가 0개 | 잘못된 VAULT_DIR 또는 빈 vault | 좌측 목록에 기존 `NoteList`의 빈 상태 문구 재사용, 중앙은 `EmptyNoteState` 그대로 |

---

## 7. Security Considerations

- N/A — 프레젠테이션 레이어 변경만 있으며 신규 입력 처리, 인증, 외부 API 호출 없음. 기존 `vault-recursive-read` 설계의 보안 고려사항이 그대로 적용됨.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Manual | 좌/중 레이아웃 렌더링, 클릭 시 부분 갱신 | `pnpm build` + 브라우저 확인 | Check |

> 프로젝트에 테스트 러너가 없어(Section 4 Regression Test Exception 해당) 수동 시나리오로 검증한다.

### 8.2 검증 시나리오

| # | 시나리오 | 절차 | 기대 결과 |
|---|----------|------|-----------|
| 1 | 홈 초기 상태 | `/` 접속 | 좌측 목록 + 중앙 EmptyNoteState 표시 |
| 2 | 노트 선택 | 좌측 목록에서 노트 클릭 | URL이 `/notes/{slug}`로 변경, 중앙에 본문 렌더링, 좌측 목록 스크롤 위치 유지 |
| 3 | 노트 간 이동 | 다른 노트 클릭 | 중앙만 교체, 전체 페이지 새로고침 없음(네트워크 탭에서 문서 재요청 없는지 확인) |
| 4 | 직접 URL 진입 | 브라우저 주소창에 `/notes/{slug}` 직접 입력 후 새로고침 | 동일한 2단 레이아웃 + 해당 노트가 함께 보임 |
| 5 | 검색 필터 | 검색어 입력 | 좌측 목록만 필터링, 중앙 콘텐츠는 유지 |
| 6 | 존재하지 않는 slug | `/notes/없는-슬러그` 진입 | 레이아웃 유지, 중앙에 404 |
| 7 | 태그 페이지 회귀 확인 | `/tags` 접속 | 기존과 동일한 단일 컬럼, 사이드바 없음 |

---

## 9. Clean Architecture

### 9.1 Layer Structure (기존 유지)

변경 없음 — 이번 기능은 Presentation 레이어(`app/`, `components/`)에만 영향을 준다.

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location | 변경 내용 |
|-----------|-------|----------|-----------|
| `BrowseLayout` | Presentation | `app/(browse)/layout.tsx` | 신규 — 서버에서 `listNotes` 호출, `NoteSidebar` + `children` 배치 |
| `NoteSidebar` | Presentation | `components/organisms/NoteSidebar.tsx` | 신규 — 클라이언트 검색/강조 로직 |
| `NoteListItem` | Presentation | `components/molecules/NoteListItem.tsx` | 신규 — 사이드바용 목록 아이템 |
| `EmptyNoteState` | Presentation | `components/atoms/EmptyNoteState.tsx` | 신규 — 안내 문구 |
| `HomePage` | Presentation | `app/(browse)/page.tsx` | 기존 `app/page.tsx` 이동 + `EmptyNoteState`만 반환하도록 축소 |
| `NotePage` | Presentation | `app/(browse)/notes/[...slug]/page.tsx` | 기존 `app/notes/[...slug]/page.tsx` 이동, `PageLayout` 제거(레이아웃이 상위에서 처리) |

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Route Group 네이밍 | `(browse)` — URL에 노출되지 않는 Next.js 관례 |
| 클라이언트 컴포넌트 경계 | `NoteSidebar`만 `'use client'` (검색 입력 상태 + `usePathname` 필요), 나머지는 서버 컴포넌트 유지 |
| 기존 컴포넌트 재사용 | `SearchInput`, `NoteContent`, `Tag`, `DateLabel`은 그대로 재사용, 신규 컴포넌트는 사이드바 전용 목록 아이템과 빈 상태만 추가 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
app/
├── (browse)/
│   ├── layout.tsx              (신규)
│   ├── page.tsx                (이동: app/page.tsx → 내용 축소)
│   └── notes/
│       └── [...slug]/
│           └── page.tsx        (이동: app/notes/[...slug]/page.tsx → PageLayout 제거)
├── tags/                        (변경 없음)
├── layout.tsx                   (변경 없음, RootLayout)
components/
├── atoms/
│   └── EmptyNoteState.tsx       (신규)
├── molecules/
│   └── NoteListItem.tsx         (신규)
├── organisms/
│   └── NoteSidebar.tsx          (신규)
```

## Implementation Order

> §11.2와 동일 순서 — 최상위 헤딩으로도 별도 노출.

1. [ ] `components/atoms/EmptyNoteState.tsx` 신규 작성 — 중앙 안내 문구
2. [ ] `components/molecules/NoteListItem.tsx` 신규 작성 — slug, title, date, isSelected prop을 받는 목록 아이템
3. [ ] `components/organisms/NoteSidebar.tsx` 신규 작성 — `'use client'`, `notes` prop 수신, `useState` 검색어 + `usePathname` 선택 판단, `SearchInput` + `NoteListItem[]` 렌더링
4. [ ] `app/(browse)/layout.tsx` 신규 작성 — `listNotes(vaultRepository)` 서버에서 페칭, `SiteHeader` + `NoteSidebar` + `{children}` 2단 레이아웃 마크업
5. [ ] `app/(browse)/page.tsx` 신규 작성(기존 `app/page.tsx` 대체) — `EmptyNoteState`만 반환
6. [ ] `app/(browse)/notes/[...slug]/page.tsx` 신규 작성(기존 `app/notes/[...slug]/page.tsx` 대체) — 기존 로직 유지, `PageLayout`/뒤로가기 링크 제거(사이드바가 항상 보이므로 불필요)
7. [ ] 기존 `app/page.tsx`, `app/notes/[...slug]/page.tsx` 삭제
8. [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 확인
9. [ ] 실제 VAULT_DIR로 `pnpm build` 후 브라우저에서 §8.2 시나리오 수동 확인

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 신규 컴포넌트 | `module-1` | EmptyNoteState, NoteListItem, NoteSidebar | 15-20 |
| 라우트 재배치 | `module-2` | (browse) Route Group, layout.tsx, page 이동 | 15-20 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1,module-2` (단일 세션 권장) | 30-40 |
| Session 3 | Check + Report | 전체 | 20-30 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

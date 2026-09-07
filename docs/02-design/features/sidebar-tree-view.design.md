---
template: design
version: 1.3
---

# sidebar-tree-view Design Document

> **Summary**: 사이드바를 slug 기반 폴더/파일 트리로 전환해 클릭으로 접고 펼칠 수 있게 하고, 사이드바를 브라우저 창 최좌단에 고정한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-04
> **Status**: Draft
> **Planning Doc**: [sidebar-tree-view.plan.md](../01-plan/features/sidebar-tree-view.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 264개 노트 평면 목록은 탐색이 어렵고, 사이드바가 `max-w-6xl` 중앙 컨테이너 안에 갇혀 화면 공간이 비효율적이다. |
| **Solution** | slug의 `/` 구분으로 폴더/파일 트리를 구성하는 순수 함수를 추가하고, `NoteSidebar`가 트리를 재귀 렌더링하며 접힘 상태를 관리한다. 사이드바는 레이아웃 최좌단으로 이동한다. |
| **Function/UX Effect** | Obsidian 파일 탐색기와 유사하게 폴더 단위로 탐색할 수 있고, 중앙 콘텐츠 영역이 넓어진다. |
| **Core Value** | 대규모 노트에서도 빠른 탐색성을 확보한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 평면 목록은 노트가 많을수록(현재 264개) 원하는 항목을 찾기 어렵고, 사이드바가 중앙 컨테이너에 종속되어 있어 화면 낭비가 있음 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) — 폴더별로 분류된 자신의 vault를 탐색 |
| **RISK** | 트리 구조의 접힘/펼침 상태를 어떻게 유지할지(세션 중 유지 vs 매번 초기화)에 따라 구현 복잡도가 달라짐 |
| **SUCCESS** | 사이드바에서 폴더를 클릭해 하위 항목을 접고 펼칠 수 있고, 사이드바가 브라우저 창 좌측 끝에 고정되어 보임 |
| **SCOPE** | `NoteSidebar`/`NoteListItem` 트리 구조 전환, `app/(browse)/layout.tsx`의 사이드바 배치 방식 변경 |

---

## 1. Overview

### 1.1 Design Goals

- slug 문자열 배열로부터 폴더/파일 트리를 순수 함수로 구성해 테스트 가능하게 한다.
- 접힘 상태는 세션 중(컴포넌트 상태)에만 유지하고, 새로고침 시 현재 선택된 노트의 조상 폴더가 자동으로 펼쳐지도록 한다(영속화 불필요 — Plan §7.2에서 Design 단계 결정 사항으로 남긴 것을 단순 컴포넌트 상태로 확정).
- 사이드바는 `position: sticky` + `h-screen`으로 화면 좌측에 고정하되, 별도 서버 상태나 레이아웃 라이브러리 없이 flexbox만으로 구현한다.

### 1.2 Design Principles

- 순수 함수 우선: 트리 변환은 `application/vault/`에 부작용 없는 함수로 분리(기존 `searchNotes`, `buildTagIndex` 패턴과 일관).
- 최소 상태: 접힘 상태는 `Set<string>`(펼쳐진 폴더 경로 집합) 하나로 관리하고, localStorage 등 영속화 계층을 추가하지 않는다.
- 기존 컴포넌트 재사용: 파일 노드는 기존 `NoteListItem`을 그대로 사용하고, 폴더 노드만 신규 컴포넌트로 추가한다.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | `NoteSidebar` 내부에 트리 로직 인라인 | localStorage 영속화 커스텀 훅 별도 분리 | 순수 함수 분리 + 컴포넌트 로컬 상태 |
| **New Files** | 1 (FolderTreeItem) | 3 (FolderTreeItem, useLocalStorage, buildNoteTree) | 2 (FolderTreeItem, buildNoteTree) |
| **Modified Files** | 2 | 3 | 3 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low(테스트 어려움, 재사용 불가) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Medium(로직이 컴포넌트에 묶여 커짐) | Low | Low |
| **Recommendation** | 비권장 | 단일 사용자 규모에 과잉 | **Default choice** |

**Selected**: Option C — **Rationale**: 트리 변환 로직을 순수 함수로 분리하면 기존 `application/vault/` 패턴과 일관되고 테스트하기 쉽다. 반면 localStorage 영속화(Option B)는 단일 사용자·단일 브라우저 환경에서 실익이 적고, SSR 하이드레이션 불일치 위험까지 추가로 감수해야 하므로 과설계다. 접힘 상태는 "현재 선택 노트의 조상 폴더는 항상 펼쳐진 채 시작"이라는 FR-03 요구사항만으로 충분히 사용성이 확보된다.

### 2.1 Component Diagram

```
app/(browse)/layout.tsx
  ├─ listNotes(vaultRepository)
  ├─ buildNoteTree(notes)  <- 신규 순수 함수, application/vault/
  ├─ <aside class="w-72 shrink-0 h-screen sticky top-0 ...">  <- 화면 최좌단 고정
  │    └─ NoteSidebar(tree, notes)
  │         ├─ SearchInput (기존 재사용)
  │         └─ TreeNode[] 재귀 렌더링
  │              ├─ FolderTreeItem (신규) - 폴더 노드, 클릭 시 접기/펼치기
  │              └─ NoteListItem (기존 재사용) - 파일 노드
  └─ <div class="flex-1"> <SiteHeader /> <main>{children}</main> </div>
```

### 2.2 Data Flow

```
listNotes() → Note[] (slug: '도메인/전력-단위' 형태)
  → buildNoteTree(notes) → TreeNode[] (폴더/파일 계층, 각 폴더는 하위 TreeNode[] 보유)
  → NoteSidebar:
       expandedFolders: Set<string> 초기값 = 현재 선택된 노트 slug의 모든 조상 폴더 경로
       검색어 있으면: 검색어와 일치하는 노트를 포함한 폴더 경로도 expandedFolders에 합집합으로 추가(임시)
       렌더링: TreeNode 재귀 순회, 폴더면 FolderTreeItem(접힘 여부는 expandedFolders.has(path)),
               파일이면 NoteListItem
       폴더 클릭 → setExpandedFolders(toggle) → 리렌더
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `buildNoteTree` | 없음(순수 함수, `Note[]`만 입력) | slug 배열을 폴더/파일 트리로 변환 |
| `NoteSidebar` | `buildNoteTree`, `FolderTreeItem`, `NoteListItem`, `usePathname` | 트리 렌더링 + 접힘 상태 관리 + 검색 |
| `FolderTreeItem` | 없음(재귀 렌더링을 위해 자기 자신을 하위에서 참조) | 폴더 노드 표시, 접기/펼치기 토글 |
| `app/(browse)/layout.tsx` | `buildNoteTree` | 트리 데이터를 서버에서 구성해 `NoteSidebar`에 전달 |

---

## Detailed Design

> 아래 §3~§9에서 데이터 모델, UI, 에러 처리, 보안, 테스트, 아키텍처 배치를 상세히 다룬다.

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// application/vault/buildNoteTree.ts

export interface FolderNode {
  readonly type: 'folder'
  readonly name: string        // 폴더 표시명(원본 대소문자, slugify 이전 세그먼트가 아닌 첫 노트의 실제 경로 세그먼트를 표시용으로 별도 보관하지 않고, slug 세그먼트를 그대로 표시 — §3.3 참고)
  readonly path: string        // 이 폴더까지의 slug 경로(예: '도메인')
  readonly children: readonly TreeNode[]
}

export interface FileNode {
  readonly type: 'file'
  readonly note: Note
}

export type TreeNode = FolderNode | FileNode
```

### 3.2 트리 구성 규칙

- `Note.slug`를 `/`로 분리해 마지막 세그먼트는 파일(`FileNode`), 나머지는 폴더 경로로 취급한다.
- 동일 폴더 경로는 하나의 `FolderNode`로 병합되며, `children`은 하위 폴더가 먼저, 그다음 파일이 이름순으로 정렬된다(폴더 우선 정렬은 Obsidian 파일 탐색기 관례).
- 폴더의 `path`는 조상까지 포함한 전체 slug 경로 문자열이며, `expandedFolders: Set<string>`의 키로 사용된다.

### 3.3 표시명 관련 제약

slug는 이미 `slugifyNoteName`으로 소문자화·공백 치환된 상태이므로, 폴더 표시명도 원본 대소문자를 잃는다(예: `AI` 폴더 → `ai`로 표시). 이는 기존 `vault-recursive-read`에서 이미 확정된 slug 정책(원본 파일 경로는 별도 보관하되 slug 자체는 소문자)과 동일한 제약이며, 이번 feature에서 새로 발생하는 문제가 아니다. Design 범위에서 폴더 표시명 대소문자 복원은 다루지 않는다(Out of Scope로 명시).

---

## 4. API Specification

해당 없음(정적 파일 기반, HTTP API 없음).

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────┬──────────────────────────────────────────────┐
│ NoteSidebar   │  SiteHeader (아래 영역 전체 폭)                │
│ (화면 최좌단, │──────────────────────────────────────────────│
│  sticky)      │                                              │
│ [검색창]      │   중앙 콘텐츠(max-w-4xl, 중앙 정렬)            │
│ ▾ 도메인      │                                              │
│   전력-단위   │                                              │
│   ...         │                                              │
│ ▸ 지식        │                                              │
│ ...           │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 5.2 User Flow

```
/ 진입 → 사이드바 트리 로드, 선택 노트 없으면 모든 폴더 접힘 상태로 시작
  → 폴더 클릭(▸) → 하위 항목 펼침(▾)
  → 파일 클릭 → /notes/{slug} 이동, 해당 파일까지의 조상 폴더 자동 펼침 유지
  → 검색어 입력 → 일치하는 파일을 포함한 폴더만 자동 펼침(검색어 지우면 이전 접힘 상태로 복귀하지 않고 선택 노트 기준으로 재계산)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `FolderTreeItem` | `components/molecules/FolderTreeItem.tsx` | 폴더 노드 1건 표시, 접기/펼치기 토글 버튼, 하위 `TreeNode[]`를 재귀적으로 렌더링 |
| `NoteListItem` | `components/molecules/NoteListItem.tsx` | 변경 없음(파일 노드 그대로 재사용) |
| `NoteSidebar` | `components/organisms/NoteSidebar.tsx` | 트리 최상위 렌더링, 접힘 상태(`expandedFolders`) 관리, 검색 상태 관리 |

### 5.4 Page UI Checklist

#### `/` 및 `/notes/{slug}` (사이드바 공통)

- [ ] 최상위 폴더들이 이름순으로 정렬되어 표시됨(폴더 우선, 그다음 파일)
- [ ] 폴더 클릭 시 하위 항목이 접히거나 펼쳐짐(화살표 아이콘 방향 반전)
- [ ] 현재 선택된 파일 노드는 강조 표시(기존 `aria-current="page"` 유지)
- [ ] 선택된 노트로 이어지는 모든 조상 폴더는 페이지 진입 시 자동으로 펼쳐진 상태
- [ ] 검색어 입력 시 일치하는 노트를 포함한 폴더만 자동 펼침, 나머지는 접힘
- [ ] 사이드바가 스크롤해도 화면 좌측에 고정되어 보임(`sticky top-0 h-screen`)
- [ ] 중앙 콘텐츠 영역이 기존보다 넓어 보임(사이드바가 `max-w-6xl` 밖으로 이동)

---

## 6. Error Handling

### 6.1 Error Case 정의

| Case | 원인 | 처리 |
|------|------|------|
| vault에 노트가 0개 | 잘못된 VAULT_DIR 또는 빈 vault | `buildNoteTree([])`는 빈 배열 반환, `NoteSidebar`는 기존과 동일하게 "검색 결과가 없습니다" 유사 문구 표시 |
| 깊은 폴더 중첩(예: 5단 이상) | vault 구조 특성 | 재귀 렌더링이므로 깊이 제한 없이 정상 동작(성능상 264개 규모에서는 문제 없음) |

---

## 7. Security Considerations

- N/A — 프레젠테이션 레이어 변경만 있으며 신규 입력 처리, 인증, 외부 API 호출 없음.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Manual | 트리 렌더링, 접기/펼치기, 레이아웃 고정 | `pnpm build` + 브라우저 확인 | Check |

> 테스트 러너 미설정으로 수동 시나리오로 검증(Section 4 Regression Test Exception 해당).

### 8.2 검증 시나리오

| # | 시나리오 | 절차 | 기대 결과 |
|---|----------|------|-----------|
| 1 | 트리 렌더링 | `/` 접속 | 264개 노트가 폴더 구조로 그룹핑되어 표시 |
| 2 | 폴더 접기/펼치기 | 폴더 클릭 | 하위 항목이 토글됨 |
| 3 | 선택 노트 조상 자동 펼침 | `/notes/도메인/전력-단위` 접속 | `도메인` 폴더가 펼쳐진 채로 표시, 해당 파일 강조 |
| 4 | 검색 시 자동 펼침 | 검색어 입력 | 일치 노트를 포함한 폴더만 펼쳐짐 |
| 5 | 사이드바 고정 | 중앙 콘텐츠 스크롤 | 사이드바가 화면 좌측에 고정된 채 유지 |
| 6 | 기존 기능 회귀 | 노트 클릭 이동, `/tags` 접속 | 기존과 동일하게 정상 동작 |
| 7 | 빌드 검증 | `pnpm build` (실제 VAULT_DIR) | 283페이지 정적 생성 성공 |

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location | 변경 내용 |
|-----------|-------|----------|-----------|
| `buildNoteTree` | Application | `application/vault/buildNoteTree.ts` | 신규 — slug 배열을 트리로 변환하는 순수 함수 |
| `FolderTreeItem` | Presentation | `components/molecules/FolderTreeItem.tsx` | 신규 — 폴더 노드 표시 및 토글 |
| `NoteSidebar` | Presentation | `components/organisms/NoteSidebar.tsx` | 수정 — 평면 목록 렌더링을 트리 재귀 렌더링으로 교체, `expandedFolders` 상태 추가 |
| `BrowseLayout` | Presentation | `app/(browse)/layout.tsx` | 수정 — `buildNoteTree` 호출 추가, 사이드바를 `max-w-6xl` 밖 최좌단으로 재배치 |

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| 트리 노드 타입 | Discriminated union(`type: 'folder' \| 'file'`)으로 폴더/파일 구분, 기존 프로젝트의 `type` 선호 컨벤션과 일관 |
| 순수 함수 위치 | `application/vault/`에 배치(기존 `searchNotes`, `buildTagIndex`와 동일 패턴) |

---

## Implementation Order

1. [ ] `application/vault/buildNoteTree.ts` 신규 작성: `Note[]` → `TreeNode[]` 변환, 폴더 우선 정렬
2. [ ] `components/molecules/FolderTreeItem.tsx` 신규 작성: 폴더명, 접힘 여부(`isExpanded`), 클릭 핸들러(`onToggle`) prop을 받아 자신과 하위 `TreeNode[]`를 재귀 렌더링(파일 노드는 `NoteListItem` 위임)
3. [ ] `components/organisms/NoteSidebar.tsx` 수정: `buildNoteTree(notes)` 호출, `expandedFolders: Set<string>` 상태 추가(초기값 = 현재 선택 slug의 조상 폴더 경로들), 검색어 있을 때 일치 폴더 합집합 계산, 평면 `.map` 렌더링을 트리 재귀 렌더링으로 교체
4. [ ] `app/(browse)/layout.tsx` 수정: 사이드바를 `max-w-6xl` 컨테이너 밖으로 이동, `flex` 최상위 레이아웃으로 재구성(사이드바 `sticky top-0 h-screen`, 나머지 영역에 `SiteHeader` + `main` 배치)
5. [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 확인
6. [ ] 실제 VAULT_DIR로 빌드 후 §8.2 시나리오 수동 확인

### Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 트리 데이터 + 컴포넌트 | `module-1` | buildNoteTree, FolderTreeItem, NoteSidebar 트리 렌더링 | 25-30 |
| 레이아웃 재배치 | `module-2` | layout.tsx 사이드바 최좌단 고정 | 10-15 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1,module-2` (단일 세션 권장) | 35-45 |
| Session 3 | Check + Report | 전체 | 20-30 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

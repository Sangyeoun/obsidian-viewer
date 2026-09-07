---
template: design
version: 1.3
---

# next-improvements Design Document

> **Summary**: 검색, VAULT_DIR 연동, 태그 인덱스/링크 무결성을 기존 Clean Architecture + Atomic Design 구조 위에 추가한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-08-21
> **Status**: Draft
> **Planning Doc**: [next-improvements.plan.md](../01-plan/features/next-improvements.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 검색 불가, VAULT_DIR 미연동, 태그 인덱스/링크 무결성 부재 (Plan 문서와 동일) |
| **Solution** | Option C(Pragmatic Balance) — domain은 변경 없이 application 레이어에 순수 함수(`searchNotes`, `buildTagIndex`)를 추가하고, infrastructure의 remark 파이프라인에 슬러그 집합을 주입해 링크 무결성을 검사 |
| **Function/UX Effect** | 신규 파일 5개, 수정 파일 4개로 기존 레이어 경계를 유지하면서 4개 요구사항(FR-01~04) 구현 |
| **Core Value** | 현재 vault 규모에 과설계 없이(YAGNI 준수) 확장 가능한 구조로 개선 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 초기 구현은 기능 시연에 집중되어 있어 노트가 소수일 때만 사용성이 좋음 — 탐색·설정 유연성·데이터 무결성 갭 존재 |
| **WHO** | vault 소유자(빌드 타임에 콘텐츠를 채우는 본인) 및 정적 사이트 방문자 |
| **RISK** | 정적 빌드 특성상 검색은 클라이언트 사이드로 제한됨 — 노트 수가 매우 많아지면 번들 크기 이슈 가능 |
| **SUCCESS** | 검색으로 제목/본문 매칭 노트 확인 가능, `VAULT_DIR` 변경 시 실제 다른 폴더를 읽음, `/tags`에서 전체 태그 확인 및 끊긴 위키링크가 콘솔/빌드 로그에 표시됨 |
| **SCOPE** | (1) 검색 (2) VAULT_DIR 연동 (3) 태그 인덱스 + 링크 무결성 — 3개 독립 단위로 순차 구현 가능 |

---

## 1. Overview

### 1.1 Design Goals

- 기존 domain 레이어(`Note`, `NoteRepository`)를 변경하지 않고 세 가지 기능을 추가한다
- 검색/태그 집계 로직은 순수 함수로 `application/vault/`에 추가해 재사용 및 수동 검증이 쉽게 한다
- 위키링크 무결성 검사는 기존 remark 파이프라인 패턴(플러그인 체인)을 그대로 따른다

### 1.2 Design Principles

- **레이어 경계 유지**: domain은 프레임워크/환경 비의존 원칙을 그대로 유지 (`CLAUDE.md` 금지 사항)
- **불변 데이터**: 신규 함수는 입력을 변경하지 않고 새 값을 반환 (`createNote` 패턴과 동일)
- **최소 변경**: 기존 `Note`/`NoteRepository`/`listNotes` 시그니처는 변경하지 않는다

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean Architecture 강화 | Option C: Pragmatic Balance |
|----------|:-:|:-:|:-:|
| **Approach** | 컴포넌트 내부에 인라인 로직 | domain에 SearchQuery/TagIndex 타입 도입 | application에 순수 함수로 분리 |
| **New Files** | 1 | 7 | 5 |
| **Modified Files** | 4 | 5 | 4 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium (컴포넌트에 로직 혼재) | High (그러나 현재 규모 대비 과설계) | High |
| **Effort** | Low | High | Medium |
| **Risk** | Low (재사용성 낮음) | Low (그러나 YAGNI 위반) | Low |
| **Recommendation** | Quick hotfix | 노트/기능이 크게 늘어날 때 | **Default choice** |

**Selected**: Option C — **Rationale**: 현재 vault 규모(수십 개 노트)에서 domain에 검색 전용 타입을 도입하는 것은 과설계(YAGNI 위반). 반대로 컴포넌트 내부 인라인 로직은 수동 검증조차 어렵게 만든다. `application/vault/`에 순수 함수로 분리하면 기존 `listNotes.ts` 패턴과 일관되고, 향후 domain 승격이 필요해지면 최소 변경으로 이전 가능하다.

> 이하 상세 설계는 Option C 기준.

### 2.1 Component Diagram

```
┌──────────────┐    ┌───────────────────────┐    ┌─────────────────────────┐
│  app/*.tsx   │───▶│ application/vault/     │───▶│ infrastructure/          │
│ (Server Comp)│    │  listNotes              │    │  FileSystemNoteRepository│
│              │    │  searchNotes (신규)     │    │   (VAULT_DIR 참조)        │
│              │    │  buildTagIndex (신규)   │    │  markdown/markdownToHtml │
└──────┬───────┘    └───────────────────────┘    │   (allSlugs 파라미터)     │
       │                                          │  markdown/remarkWikilink │
       ▼                                          │   (broken 링크 마킹)      │
┌──────────────┐                                  └─────────────────────────┘
│ NoteSearch    │ (Client Component)
│  SearchInput  │
└──────────────┘
```

### 2.2 Data Flow

**검색 (FR-01)**
```
app/page.tsx (Server) → listNotes() → 전체 Note[]를 NoteSearch(Client)에 props로 전달
  → 사용자가 SearchInput에 입력 → searchNotes(notes, query) 클라이언트에서 즉시 필터링
  → 필터링된 Note[]를 NoteList로 렌더링
```

**VAULT_DIR (FR-02)**
```
vaultRepository.ts 로드 시 → process.env.VAULT_DIR 확인
  → 있으면 path.resolve(process.cwd(), VAULT_DIR), 없으면 기존 path.join(process.cwd(), 'vault')
  → FileSystemNoteRepository 생성자에 전달 (기존과 동일한 인터페이스)
```

**태그 인덱스 (FR-03)**
```
app/tags/page.tsx (신규) → listNotes() → buildTagIndex(notes) → { tag, count }[] 반환
  → 태그명 기준 정렬 → 목록 렌더링, 각 태그는 /tags/{tag}로 링크
```

**링크 무결성 (FR-04)**
```
FileSystemNoteRepository.findAll() 진입 시 → listSlugs()로 전체 슬러그 Set 확보
  → findBySlug(slug, allSlugs) 형태로 슬러그 집합을 전달
  → markdownToHtml(content, allSlugs) → remarkWikilink(allSlugs) 플러그인이
    slugifyNoteName(target)이 allSlugs에 없으면 className에 'wikilink-broken' 추가 + console.warn
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `NoteSearch` (organism) | `searchNotes`, `NoteList` | 검색 입력 상태 관리 + 필터링된 목록 렌더링 |
| `searchNotes` | `domain/note/Note` (타입만) | 순수 필터 함수 — Note[] 입력, Note[] 출력 |
| `buildTagIndex` | `domain/note/Note` (타입만) | 순수 집계 함수 — Note[] 입력, TagCount[] 출력 |
| `FileSystemNoteRepository.findBySlug` | `remarkWikilink`의 확장 시그니처 | allSlugs를 markdownToHtml까지 전달 |

---

## 3. Data Model

### 3.1 Entity Definition

`domain/note/Note.ts`는 **변경하지 않는다**. 신규 타입은 application 레이어에 로컬로 정의한다.

```typescript
// application/vault/buildTagIndex.ts 내부
export interface TagCount {
  readonly tag: string
  readonly count: number
}
```

### 3.2 Entity Relationships

```
Note[] ──(searchNotes)──▶ Note[] (필터링됨, 구조 동일)
Note[] ──(buildTagIndex)──▶ TagCount[] (태그별 집계)
```

### 3.3 Database Schema

해당 없음 (파일시스템 기반, DB 미사용).

---

## 4. API Specification

해당 없음 — 이 기능은 REST API를 추가하지 않는다 (정적 빌드, 클라이언트 사이드 필터링).

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌────────────────────────────────────┐
│  SiteHeader                        │
├────────────────────────────────────┤
│  h1 "노트 목록"                     │
│  ┌──────────────────────────────┐  │
│  │ 🔍 SearchInput (검색어 입력)   │  │
│  └──────────────────────────────┘  │
│  NoteList (검색 결과 또는 전체)     │
├────────────────────────────────────┤
└────────────────────────────────────┘

/tags 페이지:
┌────────────────────────────────────┐
│  SiteHeader                        │
├────────────────────────────────────┤
│  h1 "태그"                          │
│  #intro (3)   #guide (2)  ...      │
└────────────────────────────────────┘
```

### 5.2 User Flow

```
홈(/) → 검색어 입력 → 필터링된 NoteList 확인 → 노트 클릭 → /notes/{slug}
홈(/) → SiteHeader "태그" 링크 → /tags → 태그 클릭 → /tags/{tag}
/notes/{slug} → 끊긴 위키링크(회색/취소선 스타일) 확인 가능
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `SearchInput` | `components/atoms/SearchInput.tsx` | 검색어 입력 필드 (제어 컴포넌트, value/onChange props) |
| `NoteSearch` | `components/organisms/NoteSearch.tsx` | Client Component. 검색 상태 관리 + `searchNotes` 호출 + `NoteList` 렌더링 |
| `TagIndexList` | `components/organisms/TagIndexList.tsx` | `/tags` 페이지의 태그+카운트 목록 렌더링 |

### 5.4 Page UI Checklist

#### 홈페이지 (`/`)

- [ ] Input: 검색어 입력 필드 (placeholder: "노트 제목 또는 내용 검색")
- [ ] List: 검색어가 비어있으면 전체 노트, 있으면 필터링된 노트만 표시
- [ ] Text: 검색 결과 0건일 때 "검색 결과가 없습니다" 안내 문구 (기존 NoteList의 "노트가 없습니다" 문구와 구분)

#### 태그 인덱스 페이지 (`/tags`, 신규)

- [ ] List: 전체 태그를 태그명 오름차순으로 나열
- [ ] Badge: 각 태그 옆에 해당 태그를 가진 노트 개수 표시 (`#intro (3)` 형태)
- [ ] Link: 각 태그 클릭 시 `/tags/{tag}`로 이동
- [ ] Text: 태그가 하나도 없을 때 안내 문구

#### 노트 상세 페이지 (`/notes/[slug]`, 기존 — 링크 무결성만 추가)

- [ ] Style: 끊긴 위키링크(`wikilink-broken` 클래스)는 기존 `wikilink` 스타일과 시각적으로 구분 (예: 취소선 + 회색, 클릭 시에도 404 페이지로 자연 이동)

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| (빌드 로그 경고) | `[wikilink] broken link: "{slug}" referenced from "{sourceSlug}"` | 위키링크 대상 슬러그가 vault에 없음 | `console.warn`으로 빌드 로그에 출력, 렌더링은 계속 진행 (빌드 실패시키지 않음) |
| (없음, 기존 동작 유지) | - | `VAULT_DIR` 경로가 존재하지 않음 | 기존 `FileSystemNoteRepository.listSlugs()`의 try/catch가 빈 배열 반환 — 이 동작은 변경하지 않음 (조용한 실패지만 기존 컨벤션이므로 이번 스코프에서 강화하지 않음) |

### 6.2 Error Response Format

해당 없음 (API 없음). 빌드 타임 경고는 `console.warn` 텍스트 메시지로 충분.

---

## 7. Security Considerations

- [x] `VAULT_DIR`은 사용자 입력이 아닌 빌드 타임 환경변수이므로 XSS/injection 대상 아님. 다만 `path.resolve()`로 정규화하여 상대 경로 표기를 명확히 한다
- [x] 검색은 클라이언트 사이드 문자열 매칭(`toLowerCase().includes()`)만 사용 — 정규식 인젝션이나 서버 호출 없음
- [x] 신규 페이지(`/tags`)는 기존 `PageLayout` 템플릿을 재사용하므로 별도 인증/인가 불필요 (전체 사이트가 공개 정적 콘텐츠)

---

## 8. Test Plan

> 이 프로젝트는 테스트 러너가 설정되어 있지 않음 (Plan 문서 Out of Scope로 확정). 아래는 Do phase에서 수행할 **수동 검증 시나리오**로 대체한다.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| 수동 검증 | 검색 필터링, VAULT_DIR 전환, 태그 인덱스, 끊긴 링크 표시 | `pnpm dev` + 브라우저 육안 확인 | Do |
| 정적 검증 | 타입/린트/빌드 | `pnpm typecheck`, `pnpm lint`, `pnpm build` | Do → Check |

### 8.2 수동 검증 시나리오 (L1 API Test 대체)

| # | 대상 | 시나리오 | 기대 결과 |
|---|------|---------|----------|
| 1 | `searchNotes` | vault의 노트 제목 일부를 입력 | 해당 노트만 필터링되어 표시 |
| 2 | `searchNotes` | 존재하지 않는 검색어 입력 | "검색 결과가 없습니다" 표시, 에러 없음 |
| 3 | `searchNotes` | 검색어를 비움 | 전체 노트 목록 복원 |
| 4 | `VAULT_DIR` | `.env.local`에 `VAULT_DIR=./mocks`처럼 다른 폴더 지정 후 `pnpm dev` 재시작 | 지정한 폴더의 `.md` 파일이 렌더링됨 |
| 5 | `VAULT_DIR` | 환경변수 제거 후 재시작 | 기존 `vault/` 폴더로 정상 복귀 |
| 6 | `buildTagIndex` | `/tags` 접속 | vault 전체 태그와 정확한 카운트 표시 |
| 7 | 링크 무결성 | vault에 존재하지 않는 노트를 가리키는 `[[nonexistent-note]]` 추가 후 빌드 | 빌드 로그에 경고 출력 + 렌더링된 페이지에서 시각적으로 구분됨 |

### 8.3 UI Action Test (L2 대체)

| # | Page | Action | Expected Result |
|---|------|--------|----------------|
| 1 | `/` | 페이지 로드 | §5.4 홈페이지 체크리스트 모든 요소 표시 |
| 2 | `/` | 검색창에 타이핑 | NoteList가 즉시 갱신 (리렌더 지연 체감 없음) |
| 3 | `/tags` | 페이지 로드 | §5.4 태그 인덱스 체크리스트 모든 요소 표시 |
| 4 | `/notes/[slug]` | 끊긴 링크 포함 노트 열람 | 끊긴 링크가 시각적으로 구분되어 표시 |

### 8.4 E2E Scenario (L3 대체)

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 검색 후 상세 진입 | `/` → 검색 → 결과 클릭 → `/notes/{slug}` | 정상 이동, 콘텐츠 렌더링 |
| 2 | 태그 탐색 | `/` → 태그 인덱스(`/tags`) → 특정 태그 클릭 → `/tags/{tag}` | 해당 태그의 노트만 표시 |

### 8.5 Seed Data Requirements

기존 `vault/*.md` (welcome.md, project-ideas.md, design-notes.md) 3개로 충분. 링크 무결성 검증(#7)을 위해 임시로 끊긴 위키링크 1개를 추가했다가 검증 후 제거한다.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Domain** | Note 엔티티 (변경 없음) | `domain/note/` |
| **Application** | listNotes(기존), searchNotes(신규), buildTagIndex(신규) | `application/vault/` |
| **Infrastructure** | FileSystemNoteRepository(VAULT_DIR), remark 파이프라인(링크 무결성) | `infrastructure/` |
| **Presentation** | SearchInput, NoteSearch, TagIndexList, 페이지 | `components/`, `app/` |

### 9.2 Dependency Rules

기존 프로젝트 규칙 그대로 유지: `app → application → domain`, `infrastructure`는 `domain`의 인터페이스만 구현. 신규 함수(`searchNotes`, `buildTagIndex`)는 `domain`의 `Note` 타입만 import하고 다른 레이어에 의존하지 않는다.

### 9.3 File Import Rules

변경 없음 (프로젝트 `CLAUDE.md` 기존 규칙 준수).

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `searchNotes` | Application | `application/vault/searchNotes.ts` |
| `buildTagIndex` | Application | `application/vault/buildTagIndex.ts` |
| `SearchInput` | Presentation (atom) | `components/atoms/SearchInput.tsx` |
| `NoteSearch` | Presentation (organism) | `components/organisms/NoteSearch.tsx` |
| `TagIndexList` | Presentation (organism) | `components/organisms/TagIndexList.tsx` |
| `FileSystemNoteRepository` 수정 | Infrastructure | `infrastructure/filesystem/FileSystemNoteRepository.ts` |
| `remarkWikilink`, `markdownToHtml` 수정 | Infrastructure | `infrastructure/markdown/` |
| `vaultRepository` 수정 | Application (composition root) | `application/vault/vaultRepository.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

기존 프로젝트 컨벤션 그대로 적용: 컴포넌트 PascalCase, 함수/변수 camelCase, 타입 PascalCase, 파일명은 컴포넌트=PascalCase.tsx, 유스케이스=camelCase.ts.

### 10.2 Import Order

기존 코드베이스 패턴(`@/` alias, type import 분리)을 그대로 따른다. 별도 정의 불필요.

### 10.3 Environment Variables

| Prefix | Purpose | Scope | Example |
|--------|---------|-------|---------|
| (prefix 없음, 서버 전용) | vault 마크다운 폴더 경로 | Server (build-time) | `VAULT_DIR=./vault` |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | 기존과 동일 (PascalCase, atoms/organisms 분류) |
| File organization | 레이어별 폴더 유지, 신규 파일도 동일 배치 |
| State management | React 기본 `useState` (Client Component 내부, 별도 상태 라이브러리 도입 안 함) |
| Error handling | 링크 무결성은 `console.warn` (빌드 실패 아님), VAULT_DIR은 기존 조용한 실패 패턴 유지 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
application/vault/
├── listNotes.ts          (기존, 변경 없음)
├── getNoteBySlug.ts       (기존, 변경 없음)
├── vaultRepository.ts     (수정: VAULT_DIR 참조)
├── searchNotes.ts         (신규)
└── buildTagIndex.ts       (신규)

infrastructure/
├── filesystem/FileSystemNoteRepository.ts  (수정: findBySlug/findAll에 allSlugs 전달)
└── markdown/
    ├── markdownToHtml.ts   (수정: allSlugs 파라미터 추가)
    └── remarkWikilink.ts   (수정: allSlugs 받아 broken 마킹 + 경고 로그)

components/
├── atoms/SearchInput.tsx        (신규)
└── organisms/
    ├── NoteSearch.tsx            (신규, 'use client')
    └── TagIndexList.tsx          (신규)

app/
├── page.tsx              (수정: NoteList → NoteSearch로 교체)
└── tags/page.tsx          (신규: 태그 인덱스)

.env.example               (수정: VAULT_DIR 설명 갱신)
README.md                  (수정: 검색/VAULT_DIR/태그 인덱스 사용법 추가)
```

### 11.2 Implementation Order

1. [ ] **VAULT_DIR 연동** (독립적, 위험도 낮음): `vaultRepository.ts`에서 `process.env.VAULT_DIR` 참조 + `path.resolve` 정규화
2. [ ] **태그 인덱스**: `buildTagIndex.ts` 순수 함수 작성 → `TagIndexList` 컴포넌트 → `app/tags/page.tsx`
3. [ ] **검색**: `searchNotes.ts` 순수 함수 작성 → `SearchInput` atom → `NoteSearch` organism → `app/page.tsx` 교체
4. [ ] **링크 무결성**: `FileSystemNoteRepository`가 slug 목록을 먼저 확보하도록 `findAll` 수정 → `markdownToHtml`/`remarkWikilink` 시그니처 확장 → 스타일(`wikilink-broken`) 추가
5. [ ] 문서화: README, `.env.example` 갱신
6. [ ] `pnpm typecheck && pnpm lint && pnpm build` 통과 확인 + §8 수동 검증 시나리오 실행

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| VAULT_DIR 연동 | `module-1` | `vaultRepository.ts` 환경변수 참조, `.env.example`/README 갱신 | 5-8 |
| 태그 인덱스 | `module-2` | `buildTagIndex`, `TagIndexList`, `app/tags/page.tsx` | 8-12 |
| 검색 | `module-3` | `searchNotes`, `SearchInput`, `NoteSearch`, `app/page.tsx` 교체 | 10-15 |
| 링크 무결성 | `module-4` | `FileSystemNoteRepository`/`markdownToHtml`/`remarkWikilink` 시그니처 확장, 스타일 추가 | 12-18 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 (완료) | - |
| Session 2 | Do | `--scope module-1,module-2` | 15-20 |
| Session 3 | Do | `--scope module-3,module-4` | 20-30 |
| Session 4 | Check + Report | 전체 | 15-20 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-21 | Initial draft (Option C 선택) | SY LEE |

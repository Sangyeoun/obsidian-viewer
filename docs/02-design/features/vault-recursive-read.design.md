---
template: design
version: 1.3
---

# vault-recursive-read Design Document

> **Summary**: FileSystemNoteRepository가 vault 하위 폴더를 재귀 탐색하도록 하고, 폴더 경로를 포함한 slug와 위키링크 파일명 역매핑을 도입한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-04
> **Status**: Draft
> **Planning Doc**: [vault-recursive-read.plan.md](../01-plan/features/vault-recursive-read.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | `FileSystemNoteRepository.listSlugs()`가 `readdir`로 vault 최상위만 읽어, 노트가 하위 폴더에 있는 실제 Obsidian vault를 VAULT_DIR로 지정하면 노트가 0개로 조회된다. |
| **Solution** | 재귀 탐색을 도입하고 slug에 폴더 경로를 포함시키며, 위키링크는 파일명→full slug 역매핑(`nameToSlugMap`)으로 기존 문법과의 호환을 유지한다. |
| **Function/UX Effect** | 하위 폴더 구조를 가진 실제 vault를 그대로 VAULT_DIR에 지정해도 모든 노트가 정상적으로 목록/조회/링크된다. |
| **Core Value** | vault 폴더 구조를 재구성하지 않고도 뷰어에 그대로 연결해 즉시 사용 가능해진다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | vault 최상위에만 있는 `.md`만 읽는 현재 구현이 실제 Obsidian vault(폴더로 분류된 노트)와 맞지 않아 VAULT_DIR 설정 후 노트가 전혀 안 읽힘 |
| **WHO** | vault를 프로젝트 루트 밖 실제 Obsidian 폴더로 연결해 쓰는 이 프로젝트의 유일 사용자(개발자 본인) |
| **RISK** | slug에 폴더 경로를 포함하면서 위키링크(파일명만 사용)와의 매칭이 깨질 수 있음 — 파일명 역매핑으로 완화. 동일 파일명이 여러 폴더에 있을 때 역매핑이 모호해짐 — 첫 매칭 사용 + 콘솔 경고로 완화 |
| **SUCCESS** | 실제 vault(264개 .md, 하위 폴더 구조)를 VAULT_DIR로 지정 시 `findAll()`이 264개 노트를 모두 반환하고, 기존 위키링크 문법(`[[개념정리]]`)이 하위 폴더 노트로 정상 연결됨 |
| **SCOPE** | FileSystemNoteRepository 재귀 탐색 + slug 구조 변경, remarkWikilink 역매핑, `/notes/[slug]` → `/notes/[...slug]` catch-all 전환 |

---

## 1. Overview

### 1.1 Design Goals

- vault 디렉터리 구조(하위 폴더 임의 깊이)를 그대로 반영해 모든 `.md` 노트를 조회 가능하게 한다.
- slug를 vault 루트 기준 상대 경로로 확장하되, 기존 위키링크 문법(`[[파일명]]`)은 코드 변경 없이 동작하게 한다.
- 기존 계층 구조(domain/application/infrastructure)와 `NoteRepository` 인터페이스 계약을 유지한다.

### 1.2 Design Principles

- 최소 변경: 새 파일/클래스 추가 없이 기존 4개 파일 + 라우트만 수정
- 인터페이스 안정성: `NoteRepository`의 메서드 시그니처(문자열 slug)는 그대로 유지
- 명시적 실패 가시화: slug 충돌은 조용히 무시하지 않고 콘솔 경고로 드러냄

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 파일명 slug 유지, 재귀만 추가 | slug 로직을 별도 유틸로 분리 | 기존 파일 확장, 신규 파일 없음 |
| **New Files** | 0 | 2 (buildSlugIndex.ts 등) | 0 |
| **Modified Files** | 2 | 6 | 5 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium (중복 파일명 시 덮어쓰기 버그 잠재) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Medium (실제 vault에 이미 중복 파일명 존재 확인됨) | Low | Low |
| **Recommendation** | 비권장 | 현 규모 대비 과잉 | **Default choice** |

**Selected**: Option C — **Rationale**: 단일 사용자, 264개 노트 규모에서 별도 slug 유틸 클래스를 신설하는 것은 과설계다. 기존 `FileSystemNoteRepository`, `remarkWikilink`, `markdownToHtml`, `getNoteBySlug` 4개 파일을 확장하고 `app/notes` 라우트만 catch-all로 바꾸는 것으로 충분하며, `NoteRepository` 인터페이스는 변경하지 않아 기존 계층 의존 방향을 그대로 유지한다.

### 2.1 Component Diagram

```
app/notes/[...slug]/page.tsx
        │ params.slug: string[] → join('/')
        ▼
application/vault/getNoteBySlug.ts
        │ listSlugs() + nameToSlugMap 구축
        ▼
infrastructure/filesystem/FileSystemNoteRepository.ts
        │ 재귀 walk(vaultDir) → slug = 상대경로(확장자 제외)
        ▼
infrastructure/markdown/markdownToHtml.ts → remarkWikilink.ts
        │ nameToSlugMap으로 [[파일명]] → full slug 변환
        ▼
domain/note/Note.ts (변경 없음)
```

### 2.2 Data Flow

```
readdir 재귀 순회 → 상대경로 slug 목록 생성
  → 파일명(확장자 제외) → slug 역매핑 테이블(nameToSlugMap) 구축
  → 각 노트 파일 읽기 → markdownToHtml(content, { allSlugs, nameToSlugMap, sourceSlug })
  → remarkWikilink가 [[파일명]] 발견 시 nameToSlugMap 조회 → 있으면 full slug, 없으면 기존 slugifyNoteName 폴백
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `FileSystemNoteRepository` | Node `fs/promises` (`readdir` withFileTypes) | 재귀 디렉터리 탐색 |
| `remarkWikilink` | `nameToSlugMap` (신규 옵션) | 파일명 기반 위키링크를 full slug로 해석 |
| `getNoteBySlug` | `FileSystemNoteRepository.listSlugs`, 파일명 추출 로직 | nameToSlugMap 구축 후 `findBySlug`에 전달 |
| `app/notes/[...slug]/page.tsx` | `getNoteBySlug`, `listNotes` | slug 배열을 `/`로 join하여 기존 로직 재사용 |

---

## Detailed Design

> 아래 §3~§9에서 데이터 모델, API/내부 계약, UI, 에러 처리, 보안, 테스트, 아키텍처 배치를 상세히 다룬다.

---

## 3. Data Model

### 3.1 Entity Definition

`Note` 도메인 엔티티(`domain/note/Note.ts`)는 변경 없음. `slug: string` 필드의 **값 형식**만 확장된다 (예: `"전력-단위"` → `"도메인/전력-단위"`).

```typescript
// 변경 없음 — 기존 Note 타입 그대로
interface Note {
  slug: string  // 이제 '/' 구분 상대 경로를 포함할 수 있음
  frontmatter: NoteFrontmatter
  rawContent: string
  html: string
  tags: string[]
  linkedSlugs: string[]
}
```

### 3.2 신규 개념: nameToSlugMap

```typescript
// FileSystemNoteRepository 내부에서 findAll() 시점에 구축, 외부 노출 안 함(getNoteBySlug 내부에서도 동일 로직으로 구축)
type NameToSlugMap = ReadonlyMap<string, string>  // key: 파일명(확장자 제외), value: full slug
```

동일 파일명이 여러 경로에 존재하면 **먼저 발견된 것**(디렉터리 순회 순서 기준)을 사용하고 `console.warn`으로 경고한다.

---

## 4. API Specification

해당 없음 (정적 파일 기반 리포지토리, HTTP API 없음).

### 4.1 변경되는 내부 계약

| 함수 | 기존 시그니처 | 변경 후 시그니처 | 비고 |
|------|--------------|------------------|------|
| `FileSystemNoteRepository.listSlugs()` | `Promise<readonly string[]>` | 동일 (반환값에 `/` 포함 가능) | 시그니처 불변 |
| `FileSystemNoteRepository.findBySlug(slug, allSlugs?)` | `Promise<Note \| null>` | 동일 | 시그니처 불변, 내부적으로 slug를 경로로 join하여 파일 탐색 |
| `remarkWikilink(options)` | `{ allSlugs?, sourceSlug? }` | `{ allSlugs?, sourceSlug?, nameToSlugMap? }` | 옵션 추가(하위 호환) |
| `markdownToHtml(markdown, options)` | `{ allSlugs?, sourceSlug? }` | `{ allSlugs?, sourceSlug?, nameToSlugMap? }` | 옵션 추가(하위 호환) |

---

## 5. UI/UX Design

### 5.1 라우트 변경

```
기존: app/notes/[slug]/page.tsx        (params: { slug: string })
변경: app/notes/[...slug]/page.tsx     (params: { slug: string[] })
       └─ const slugPath = slug.join('/')
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `NotePage` | `app/notes/[...slug]/page.tsx` | catch-all slug를 join하여 기존 `getNoteBySlug` 호출 (내부 로직 변경 없음) |

### 5.4 Page UI Checklist

이번 변경은 UI 요소 추가/변경이 없다 (기존 노트 상세 페이지, 목록, 태그 인덱스, 검색 UI 그대로). 검증 대상은 **데이터**가 하위 폴더 노트까지 정상 표시되는지 여부다.

#### 노트 목록 페이지 (`/`)

- [x] 카드 목록: 하위 폴더 노트(예: `도메인/전력 단위`)도 카드로 표시됨
- [x] 카드 링크: `/notes/도메인/전력-단위` 형태로 정상 이동

#### 노트 상세 페이지 (`/notes/[...slug]`)

- [x] 하위 폴더 노트 본문/제목/태그 정상 렌더링
- [x] 본문 내 `[[개념정리]]` 위키링크가 실제 위치한 폴더의 slug로 정상 연결
- [x] 존재하지 않는 위키링크는 기존과 동일하게 `wikilink-broken` 처리

#### 태그 인덱스 페이지 (`/tags`)

- [x] 하위 폴더 노트의 태그도 집계에 포함됨

---

## 6. Error Handling

### 6.1 Error Case 정의

| Case | 원인 | 처리 |
|------|------|------|
| 동일 파일명이 여러 폴더에 존재 | vault 구조상 정상적으로 발생 가능 (실측 1건: `개념정리.md`) | `console.warn`으로 경고, 첫 매칭 slug로 위키링크 연결. 노트 자체는 각자 고유 slug로 정상 조회 가능 |
| `readdir` 실패 (권한 없음 등) | 잘못된 VAULT_DIR 또는 접근 권한 문제 | 기존과 동일하게 빈 배열 반환 (`try/catch` 유지) |
| 위키링크 대상 파일명이 vault 어디에도 없음 | 오타 또는 삭제된 노트 참조 | 기존과 동일하게 `wikilink-broken` 처리 + 콘솔 경고 |

---

## 7. Security Considerations

- [x] 입력 검증: VAULT_DIR은 빌드 타임 환경변수로만 결정되며 사용자 입력을 받지 않음 (기존과 동일)
- [x] 경로 순회(path traversal): slug는 vault 내부에서 열거된 실제 파일 경로에서만 파생되므로 외부 입력 기반 임의 경로 접근 없음
- N/A: 인증/인가, 암호화, HTTPS, Rate Limiting (정적 빌드 도구 특성상 해당 없음)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Unit | `FileSystemNoteRepository` 재귀 탐색, `nameToSlugMap` 충돌 처리 | (프로젝트 테스트 러너 없음 — 수동 스크립트로 검증) | Do |
| Unit | `remarkWikilink` nameToSlugMap 우선 매칭 및 폴백 | 상동 | Do |
| Manual | 실제 VAULT_DIR(264개 노트) 빌드 후 목록/상세/태그/검색 확인 | `pnpm build` + 브라우저 확인 | Check |

> 본 프로젝트는 `obsidian-viewer-testing` 스킬 기준 별도 테스트 러너(Jest/Vitest)가 설정되어 있지 않음. Section 4의 Regression Test Exception에 해당(No test infrastructure exists in the repository for this code path). 대신 `mocks/` 목업 데이터를 활용한 수동 검증 스크립트로 대체한다.

### 8.2 검증 시나리오 (수동)

| # | 시나리오 | 절차 | 기대 결과 |
|---|----------|------|-----------|
| 1 | 하위 폴더 재귀 탐색 | `VAULT_DIR`을 임시 테스트 폴더(하위 폴더 2단 포함)로 지정 후 `listSlugs()` 호출 | 모든 깊이의 `.md`가 slug로 반환됨 |
| 2 | slug 경로 형식 | 위 결과에서 `도메인/전력-단위`처럼 `/` 포함 여부 확인 | 폴더 세그먼트가 kebab 정규화되어 포함됨 |
| 3 | 동일 파일명 충돌 | `a/x.md`, `b/x.md` 두 파일 준비 후 `findAll()` 실행 | 두 노트 모두 개별 slug로 조회 가능, 콘솔에 경고 1회 출력 |
| 4 | 위키링크 정상 연결 | 폴더 안 노트에서 `[[x]]` 작성 후 렌더링 | `/notes/{실제 slug}`로 연결, `wikilink-broken` 아님 |
| 5 | 끊긴 링크 유지 | 존재하지 않는 파일명 `[[없는노트]]` | 기존과 동일하게 broken 처리 |
| 6 | 실제 vault 빌드 | 실 VAULT_DIR(264개)로 `pnpm build` | 빌드 성공, 홈/태그 페이지에 264개 노트 반영 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| 테스트용 노트 (하위 폴더 2단, 중복 파일명 1쌍 포함) | 3~5개 | frontmatter.tags, 본문 내 위키링크 |

---

## 9. Clean Architecture

### 9.1 Layer Structure (기존 유지)

| Layer | Responsibility | Location |
|-------|---------------|----------|
| Presentation | 라우트, 컴포넌트 | `app/`, `components/` |
| Application | 유스케이스 | `application/vault/` |
| Domain | 엔티티, 인터페이스 | `domain/note/` |
| Infrastructure | 파일시스템/마크다운 구현체 | `infrastructure/` |

### 9.2 Dependency Rules

변경 없음. `domain`은 여전히 아무 것도 import하지 않으며, `infrastructure`가 `domain`의 `NoteRepository` 인터페이스를 구현한다.

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location | 변경 내용 |
|-----------|-------|----------|-----------|
| `FileSystemNoteRepository` | Infrastructure | `infrastructure/filesystem/FileSystemNoteRepository.ts` | 재귀 walk 헬퍼 추가, slug를 상대경로 기반으로 생성 |
| `remarkWikilink` | Infrastructure | `infrastructure/markdown/remarkWikilink.ts` | `nameToSlugMap` 옵션 추가 |
| `markdownToHtml` | Infrastructure | `infrastructure/markdown/markdownToHtml.ts` | `nameToSlugMap` 옵션 전달 통로 추가 |
| `getNoteBySlug` | Application | `application/vault/getNoteBySlug.ts` | `listSlugs()` 결과로 `nameToSlugMap` 구축 후 전달 |
| `NotePage` | Presentation | `app/notes/[...slug]/page.tsx` | catch-all 세그먼트로 전환, `slug.join('/')` |

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| slug 정규화 | 기존 `slugifyNoteName`(소문자화, 공백→하이픈)을 경로의 각 세그먼트에 동일 적용 |
| 파일 구성 | 새 파일 생성 없음 — 기존 파일 내 함수 추가/확장 |
| 주석 | 변경 지점에 `// Design Ref: §{section}` 형식 유지 (프로젝트 기존 컨벤션) |

---

## 11. Implementation Guide

### 11.1 File Structure (변경 파일만)

```
infrastructure/
├── filesystem/
│   └── FileSystemNoteRepository.ts   (수정: 재귀 walk, slug 상대경로화, nameToSlugMap 구축)
├── markdown/
│   ├── remarkWikilink.ts             (수정: nameToSlugMap 옵션)
│   └── markdownToHtml.ts             (수정: nameToSlugMap 전달)
application/
└── vault/
    └── getNoteBySlug.ts              (수정: nameToSlugMap 구축 후 전달)
app/
└── notes/
    └── [...slug]/page.tsx            (신규 위치, 기존 [slug]/page.tsx 대체)
```

## Implementation Order

> §11.2와 동일 순서 — 최상위 헤딩으로도 별도 노출.

1. [ ] `FileSystemNoteRepository`: `readdir(..., { withFileTypes: true })` 기반 재귀 walk 헬퍼 구현, slug = vault 루트 기준 상대경로(POSIX `/` 구분, 세그먼트별 `slugifyNoteName` 적용, 확장자 제외)
2. [ ] `FileSystemNoteRepository.findAll()`: 파일명(확장자 제외, slugify 전) → full slug 매핑을 만들어 `nameToSlugMap`으로 구성, 중복 시 첫 매칭 유지 + `console.warn`
3. [ ] `findBySlug(slug, allSlugs?, nameToSlugMap?)`: slug를 `path.join`으로 파일 경로 변환해 파일 읽기 (기존 로직과 유사, 경로 join만 추가)
4. [ ] `remarkWikilink`: `nameToSlugMap` 옵션 추가, 위키링크 target에서 `nameToSlugMap.get(원본 파일명)` 우선 조회 → 없으면 기존 `slugifyNoteName(target)` 폴백
5. [ ] `markdownToHtml`: 옵션에 `nameToSlugMap` 추가해 `remarkWikilink`로 전달
6. [ ] `getNoteBySlug`: `listSlugs()`뿐 아니라 파일명→slug 역매핑도 구성해 `findBySlug`에 전달 (구현 편의상 `FileSystemNoteRepository`가 이 매핑 구축 로직을 재사용할 수 있도록 내부 헬퍼를 export하거나 `findAll` 경로와 동일 로직 재사용)
7. [ ] `app/notes/[slug]/page.tsx` → `app/notes/[...slug]/page.tsx`로 이동, `params.slug: string[]`을 `join('/')`하여 기존 `getNoteBySlug`/`generateStaticParams` 로직에 사용 (`generateStaticParams`는 `note.slug.split('/')`로 배열 반환)
8. [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 확인
9. [ ] 실제 VAULT_DIR로 `pnpm build` 실행해 264개 노트 반영 확인

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 재귀 탐색 + slug 구조 | `module-1` | FileSystemNoteRepository 재귀 walk, slug 상대경로화, nameToSlugMap 구축 | 15-20 |
| 위키링크 역매핑 | `module-2` | remarkWikilink/markdownToHtml/getNoteBySlug에 nameToSlugMap 연결 | 10-15 |
| 라우트 전환 | `module-3` | app/notes catch-all 전환, generateStaticParams 수정 | 8-10 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1,module-2,module-3` (규모가 작아 단일 세션 권장) | 30-40 |
| Session 3 | Check + Report | 전체 | 20-30 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

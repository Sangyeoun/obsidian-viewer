---
template: plan
version: 1.3
---

# vault-recursive-read Planning Document

> **Summary**: VAULT_DIR을 하위 폴더가 있는 실제 Obsidian vault로 지정했을 때 노트가 하나도 읽히지 않는 버그를 수정한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-04
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | `FileSystemNoteRepository.listSlugs()`가 `readdir`로 vault 최상위만 읽어, 노트가 하위 폴더에 있는 실제 Obsidian vault(예: `도메인/`, `비망/`)를 VAULT_DIR로 지정하면 노트가 0개로 조회된다. |
| **Solution** | vault 디렉터리를 재귀적으로 탐색하도록 `listSlugs`/`findBySlug`를 수정하고, slug에 폴더 경로를 포함시켜 동일 파일명 충돌(`개념정리.md` 등)을 방지한다. 위키링크는 파일명→전체 slug 역매핑으로 기존 문법과의 호환을 유지한다. |
| **Function/UX Effect** | 하위 폴더 구조를 가진 실제 vault를 그대로 VAULT_DIR에 지정해도 모든 노트가 정상적으로 목록/조회/링크된다. URL이 `/notes/도메인/전력-단위`처럼 폴더 경로를 반영한다. |
| **Core Value** | 사용자가 Obsidian vault 폴더 구조를 재구성하지 않고 그대로 뷰어에 연결할 수 있게 되어, 설정 즉시 사용 가능한 도구가 된다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | vault 최상위에만 있는 `.md`만 읽는 현재 구현이 실제 Obsidian vault(폴더로 분류된 노트)와 맞지 않아 VAULT_DIR 설정 후 노트가 전혀 안 읽힘 |
| **WHO** | vault를 프로젝트 루트 밖 실제 Obsidian 폴더로 연결해 쓰는 이 프로젝트의 유일 사용자(개발자 본인) |
| **RISK** | slug에 폴더 경로를 포함하면서 위키링크(파일명만 사용)와의 매칭이 깨질 수 있음 — 파일명 역매핑으로 완화. 동일 파일명이 여러 폴더에 있을 때 역매핑이 모호해짐 — 첫 매칭 사용 + 콘솔 경고로 완화 |
| **SUCCESS** | 실제 vault(264개 .md, 하위 폴더 구조)를 VAULT_DIR로 지정 시 `findAll()`이 264개 노트를 모두 반환하고, 기존 위키링크 문법(`[[개념정리]]`)이 하위 폴더 노트로 정상 연결됨 |
| **SCOPE** | FileSystemNoteRepository 재귀 탐색 + slug 구조 변경, remarkWikilink 역매핑, `/notes/[slug]` → `/notes/[...slug]` catch-all 전환. 기존 tags/search 기능과의 연동은 슬러그 문자열 사용 방식 그대로 유지 |

---

## 1. Overview

### 1.1 Purpose

VAULT_DIR 환경변수로 지정한 실제 Obsidian vault(하위 폴더 구조 포함)에서 노트가 하나도 조회되지 않는 버그를 수정한다.

### 1.2 Background

`.env`에 `VAULT_DIR=/Users/leesangyeoun/Documents/Obsidian Vault`를 설정했으나 노트가 읽히지 않는다는 사용자 보고로 조사한 결과, 해당 경로에는 `.md` 파일 264개가 모두 하위 폴더(`도메인/`, `git issues/`, `비망/` 등)에 있고 최상위에는 하나도 없음을 확인했다. `infrastructure/filesystem/FileSystemNoteRepository.ts`의 `listSlugs()`는 `readdir(vaultDir)`로 최상위 항목만 읽어 `.md` 필터링하므로 이 구조에서는 항상 빈 배열을 반환한다. 이는 VAULT_DIR 설정 자체의 문제가 아니라, 리포지토리 구현이 평면(flat) vault 구조만 지원하는 구조적 한계다.

### 1.3 Related Documents

- 관련 기존 기능: `docs/01-plan/features/next-improvements.plan.md` (VAULT_DIR 최초 도입)
- 관련 기존 설계: `docs/02-design/features/next-improvements.design.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] `FileSystemNoteRepository.listSlugs()` / `findBySlug()`를 하위 폴더까지 재귀 탐색하도록 변경
- [ ] slug에 폴더 경로 포함 (예: `도메인/전력-단위`)
- [ ] 동일 파일명이 여러 폴더에 존재할 경우를 감지해 콘솔 경고 출력 (예: `개념정리.md`)
- [ ] 위키링크 `[[파일명]]` 매칭을 위한 "파일명 → full slug" 역매핑 테이블 도입 (`remarkWikilink` 옵션 확장)
- [ ] `app/notes/[slug]/page.tsx` → `app/notes/[...slug]/page.tsx` catch-all 라우트로 전환
- [ ] slug를 사용하는 다른 지점(`NoteCard`, `NoteList`, `getNoteBySlug`, 태그 인덱스, 검색) 동작 확인 및 필요 시 수정

### 2.2 Out of Scope

- Obsidian 전용 문법(임베드, 다이어그램 등) 추가 지원
- vault 파일 변경 감시(watch) 및 증분 빌드
- 위키링크 문법 자체를 폴더 경로 포함 형태로 바꾸는 것 (Obsidian 원본 문법 호환성 유지)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | vault 하위 폴더에 있는 모든 `.md` 파일을 재귀적으로 탐색해 노트로 인식한다 | High | Pending |
| FR-02 | slug는 vault 루트 기준 상대 경로(확장자 제외, 폴더 구분자 `/`)로 구성한다 | High | Pending |
| FR-03 | 동일 파일명이 여러 폴더에 있을 경우, 위키링크 역매핑은 최초 발견된 것을 사용하고 콘솔에 경고를 남긴다 | Medium | Pending |
| FR-04 | 기존 위키링크 문법 `[[파일명]]`, `[[파일명\|표시명]]`은 하위 폴더 노트에도 그대로 동작한다 | High | Pending |
| FR-05 | `/notes/{slug}` URL이 폴더 경로를 포함한 slug를 그대로 반영한다 (`/notes/도메인/전력-단위`) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Correctness | 264개 실제 vault 노트가 전부 `findAll()`에 포함됨 | 빌드 로그/수동 카운트 확인 |
| Backward Compatibility | 기존 `vault/` 최상위 평면 구조(테스트용)도 동일하게 동작 | 기존 vault 폴더로 빌드 재확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 재귀 탐색 구현 및 슬러그 경로 포함 완료
- [ ] catch-all 라우트 전환 완료
- [ ] 위키링크 역매핑 구현 및 하위 폴더 노트 링크 정상 동작
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과
- [ ] 실제 VAULT_DIR(264개 노트)로 빌드 시 노트 목록/개별 노트/태그 인덱스/검색이 정상 동작

### 4.2 Quality Criteria

- [ ] 신규 로직에 대한 유닛 테스트 추가 (재귀 탐색, 파일명 역매핑 충돌 케이스 포함)
- [ ] 빌드 성공, lint/typecheck 오류 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 동일 파일명 충돌로 위키링크가 의도치 않은 노트로 연결됨 | Medium | Medium (실제 vault에 1건 확인됨) | 첫 매칭 사용 + 빌드 시 콘솔 경고로 가시화. 필요 시 사용자가 파일명 변경으로 해결 |
| catch-all 라우트 전환 시 기존 정적 생성(`generateStaticParams`) 로직 영향 | Medium | Medium | `getNoteBySlug`/`listSlugs` 반환값을 배열 slug(`string[]`)로 다루도록 관련 지점 일괄 점검 |
| slug에 한글/공백 포함 시 URL 인코딩 이슈 | Low | Low | 기존 `slugifyNoteName`의 소문자/공백→하이픈 정규화를 폴더 세그먼트별로 동일 적용 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `NoteRepository.listSlugs/findBySlug` | Interface + 구현 | 재귀 탐색, slug에 경로 포함 |
| `remarkWikilink` | 마크다운 플러그인 | 파일명→full slug 역매핑 옵션 추가 |
| `app/notes/[slug]/page.tsx` | 라우트 | `[...slug]` catch-all로 전환 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| slug (string) | READ | `app/page.tsx` → `NoteList`/`NoteCard`/`NoteSearch` | 슬러그가 `/` 포함 문자열이 되어도 문자열로만 다뤄지면 영향 없음, 링크 생성부(`href`) 확인 필요 |
| slug (string) | READ | `application/vault/getNoteBySlug.ts` | 인자가 단일 문자열→배열 조인 여부 확인 필요 |
| slug (string) | READ | `app/tags/page.tsx`, `application/vault/buildTagIndex.ts` | 태그 인덱스에서 노트로의 링크 생성 시 slug 그대로 사용, 영향 없음(문자열 기반) |
| slug (string) | READ | `application/vault/searchNotes.ts` | 검색 결과 링크에 slug 사용, 영향 없음(문자열 기반) |

### 6.3 Verification

- [ ] 위 소비처 전체가 slug를 순수 문자열로만 다루는지 확인 (경로 세그먼트 분리 로직 없는지)
- [ ] `app/notes/[slug]` catch-all 전환 시 `params.slug`가 배열이 되므로 join 처리 필요한 지점 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Enterprise** (클린 아키텍처, 기존 유지) | 계층 분리, domain/application/infrastructure | 이 프로젝트의 기존 구조 | ☑ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 재귀 탐색 위치 | infrastructure 내부 구현 vs domain 인터페이스 변경 | infrastructure 내부(FileSystemNoteRepository)만 변경 | `NoteRepository` 인터페이스 시그니처는 유지 가능(슬러그가 문자열이라는 계약은 동일), 구현 세부사항만 변경 |
| 위키링크 매칭 | 폴더 경로 명시 요구 vs 파일명 역매핑 | 파일명 역매핑 | Obsidian 원본 vault의 위키링크 문법을 변경 없이 그대로 사용하기 위함 |
| 라우팅 | 단일 slug 유지 vs catch-all | catch-all(`[...slug]`) | slug에 `/`가 포함되므로 Next.js 라우트 세그먼트 매칭을 위해 필수 |

### 7.3 Clean Architecture Approach

```
기존 계층 구조 유지, 변경 범위는 infrastructure/markdown(remarkWikilink)과
infrastructure/filesystem(FileSystemNoteRepository), app/notes 라우트로 국한.
domain(Note, NoteRepository)은 인터페이스 시그니처 변경 없음.
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 코딩 컨벤션 섹션 존재
- [x] ESLint 설정 존재
- [x] TypeScript 설정 존재

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| Slug 구조 | 파일명만 | 폴더 경로 포함 slug 규칙 문서화 | High |

### 8.3 Environment Variables Needed

기존 `VAULT_DIR` 외 신규 환경변수 없음.

---

## 9. Next Steps

1. [ ] `/pdca design vault-recursive-read` 로 설계 문서 작성
2. [ ] 구현 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

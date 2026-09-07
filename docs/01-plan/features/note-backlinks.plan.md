---
template: plan
version: 1.3
description: PDCA Plan phase document template with Context Anchor and Architecture considerations
variables:
  - feature: note-backlinks
  - date: 2026-09-07
  - author: SY LEE
  - project: obsidian-viewer
  - version: 0.1.0
---

# note-backlinks Planning Document

> **Summary**: 노트 상세 페이지 본문 하단에, 현재 노트를 위키링크로 참조하는 다른 노트 목록(Backlinks)을 표시한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-07
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 위키링크는 순방향(노트 A → 노트 B)만 확인 가능하고, 어떤 노트들이 특정 노트를 참조하고 있는지(역방향)는 알 수 없다 |
| **Solution** | 빌드 타임에 전체 vault의 `linkedSlugs`를 역인덱싱하여 slug → 참조 노트 목록 맵을 만들고, 노트 상세 페이지 본문 하단에 "Backlinks" 섹션으로 표시한다 |
| **Function/UX Effect** | 노트 하단에서 "이 노트를 참조하는 노트" 목록을 확인하고 바로 이동할 수 있어, Obsidian처럼 지식 그래프를 양방향으로 탐색할 수 있다 |
| **Core Value** | 이미 파싱되어 있는 `Note.linkedSlugs` 데이터만 재구성하면 되므로, 신규 파싱 로직 없이 빌드 타임 역인덱스만 추가하는 저비용 고효율 기능 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 위키링크가 순방향만 지원되어 "누가 나를 참조하는가"를 알 수 없음 |
| **WHO** | vault 노트 간 연결 관계를 탐색하려는 뷰어 사용자 |
| **RISK** | vault 규모가 커질 경우 전체 노트 순회 비용 증가 (단, 빌드 타임 1회 계산이라 런타임 영향 없음) |
| **SUCCESS** | 노트 상세 페이지 하단에 해당 노트를 참조하는 노트 목록이 정확히 표시되고 클릭 시 이동 가능 |
| **SCOPE** | 백링크 역인덱스 생성(인프라) → 노트 상세 페이지 Backlinks 섹션(UI), 총 1 phase |

---

## 1. Overview

### 1.1 Purpose

예시와 같이 A.md, B.md가 각각 `[[수급조정시장]]`을 참조할 때, `수급조정시장.md` 상세 페이지에 "Backlinks: A, B"를 표시하여 역방향 참조 관계를 노출한다.

### 1.2 Background

- `domain/note/Note.ts`의 `linkedSlugs: readonly string[]`는 이미 "이 노트가 참조하는 다른 노트들의 slug"를 담고 있다 (`FileSystemNoteRepository.readNote`에서 `extractWikilinkSlugs`로 채워짐).
- 백링크는 이 순방향 데이터를 전체 vault 기준으로 역으로 뒤집기만 하면 얻어진다 — 신규 파싱 로직 불필요.
- `application/vault/listNotes`로 전체 노트를 이미 조회할 수 있으므로, 이를 활용해 역인덱스를 구성한다.

### 1.3 Related Documents

- `domain/note/Note.ts` (`linkedSlugs` 필드)
- `infrastructure/filesystem/FileSystemNoteRepository.ts` (`extractWikilinkSlugs`)
- `docs/01-plan/features/note-toc.plan.md` (같은 세션에서 계획된 별개 기능 — TOC와 Backlinks는 서로 독립적으로 구현 가능)

---

## 2. Scope

### 2.1 In Scope

- [ ] 전체 vault 노트의 `linkedSlugs`를 순회하여 `slug → 참조하는 노트 slug 목록` 역인덱스(백링크 맵) 생성
- [ ] 노트 상세 페이지 본문(`NoteContent`) 하단에 "Backlinks" 섹션 추가
- [ ] Backlinks 항목 클릭 시 해당 노트 상세 페이지로 이동
- [ ] 자신을 참조하는 노트가 없는 경우 Backlinks 섹션을 표시하지 않음(빈 섹션 노출 방지)
- [ ] 깨진 위키링크(존재하지 않는 slug를 가리키는 링크)는 역인덱스에서 자동 제외 (이미 `allSlugs` 기반 무결성 검증이 되어 있는 `linkedSlugs`를 재사용하므로 자연히 보장됨)

### 2.2 Out of Scope

- 백링크 개수/그래프 시각화 (노드-엣지 그래프 뷰)
- 백링크 목록 내 미리보기(context snippet) 표시 — 노트 제목/링크만 표시
- 홈(`/`), 태그(`/tags`) 등 노트 본문이 없는 페이지에 대한 백링크 적용

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 전체 vault 노트를 순회해 slug 기준 역인덱스(백링크 맵)를 생성한다 | High | Pending |
| FR-02 | 노트 상세 페이지 하단에 현재 노트를 참조하는 노트 목록(Backlinks)을 표시한다 | High | Pending |
| FR-03 | Backlinks 항목은 노트 제목(또는 slug)과 링크로 구성되며 클릭 시 해당 노트로 이동한다 | High | Pending |
| FR-04 | 백링크가 없는 노트는 Backlinks 섹션을 렌더링하지 않는다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|--------------------|
| Performance | 역인덱스는 빌드 타임(정적 생성) 1회 계산, 런타임 비용 없음 | 프로덕션 빌드 시간 확인 |
| Consistency | 백링크 목록은 기존 위키링크 무결성 검증(끊긴 링크 제외) 규칙과 동일하게 적용 | 코드 리뷰 |
| Accessibility | Backlinks는 `nav` 또는 명확한 heading + 목록 구조로 마크업 | 코드 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 예시 시나리오(A.md, B.md → 수급조정시장.md)에서 수급조정시장 노트 하단에 A, B가 Backlinks로 표시된다
- [ ] 백링크 항목 클릭 시 정확한 노트로 이동한다
- [ ] 백링크가 없는 노트에서는 섹션이 표시되지 않는다
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` 통과

### 4.2 Quality Criteria

- [ ] 기존 아키텍처 의존 방향(domain ← application ← infrastructure ← app) 유지
- [ ] Zero lint errors
- [ ] Build succeeds (기존 정적 라우트 수 유지)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 역인덱스 생성 위치를 잘못 선택해 매 노트 상세 페이지 렌더링마다 전체 vault를 다시 순회하면 빌드 시간 증가 | Medium | Medium | `application/vault/`에 `buildBacklinkIndex` 유스케이스를 두고, 페이지 레벨에서 1회만 계산해 재사용 (Design 단계에서 캐싱 지점 구체화) |
| 노트 제목이 없는 경우(frontmatter title 미설정) Backlinks 표시 텍스트가 slug로 노출되어 가독성 저하 | Low | Low | 기존 `getNoteTitle` 유틸(제목 없으면 slug로 폴백)을 그대로 재사용해 다른 화면과 표시 규칙 통일 |
| 순환 참조(A→B, B→A)나 자기 참조(A→A) 시 UI가 어색해질 가능성 | Low | Low | 자기 자신을 가리키는 백링크는 표시에서 제외; 순환 참조는 정상 동작(A 상세에 B 백링크, B 상세에 A 백링크 각각 표시)이므로 별도 처리 불필요 |

---

## 6. Impact Analysis

> **Purpose**: List every existing consumer of the resources being changed.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `application/vault/` | Application Layer | `buildBacklinkIndex.ts`(신규) 유스케이스 추가 — 기존 `buildNoteTree.ts`, `buildTagIndex.ts`와 동일 패턴 |
| `app/(browse)/notes/[...slug]/page.tsx` | App Route | 페이지 하단에 Backlinks 섹션 추가 |
| `components/organisms/` | UI | `NoteBacklinks`(신규) 컴포넌트 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `Note.linkedSlugs` | READ | `FileSystemNoteRepository.readNote` (생성 시점) | None — 읽기만 하며 기존 필드/로직 변경 없음 |
| `listNotes` | READ | `app/(browse)/layout.tsx`, 신규 `buildBacklinkIndex` | None — 기존 호출은 그대로, 신규 호출 지점 추가만 발생 |

### 6.3 Verification

- [ ] 기존 `buildNoteTree`, `buildTagIndex`와 동일하게 `listNotes` 결과를 입력으로 받는 순수 함수로 구현되었는지 확인
- [ ] 위키링크 무결성 검증(끊긴 링크)이 백링크 역인덱스에도 일관되게 반영되는지 확인 (끊긴 링크는애초에 `linkedSlugs`에 포함되지 않으므로 자동 보장)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☐ |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | ☑ (기존 프로젝트 구조 계승, 클린 아키텍처 + Atomic Design) |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 역인덱스 생성 위치 | domain 헬퍼 vs application 유스케이스 | `application/vault/buildBacklinkIndex.ts` | 여러 `Note`(전체 vault)를 입력받아 파생 데이터를 만드는 것은 순수 도메인 로직이 아니라 유스케이스 조합 — 기존 `buildTagIndex.ts`, `buildNoteTree.ts`와 동일 패턴 |
| 계산 시점 | 요청마다 계산 vs 빌드 타임 1회 계산 후 페이지에서 조회 | 빌드 타임 1회 계산 | 프로젝트 전체가 정적 생성(SSG) 기반이며 vault는 빌드 시점에 고정되므로, 페이지 컴포넌트에서 `listNotes` 결과로 인덱스를 구성해 재사용 |
| 표시 위치 | 본문 하단 vs 우측 패널 | 본문 하단 | Obsidian의 기본 UX와 유사하며, note-toc의 우측 패널과 독립적으로 동작해 두 기능 간 결합도를 낮춤 |
| Styling | Tailwind (기존 컨벤션) | Tailwind | 프로젝트 전체가 Tailwind 사용 중 |

### 7.3 Clean Architecture Approach

```
Selected Level: Enterprise (기존 구조 유지)

기존 구조:
domain/            # 변경 없음 (Note.linkedSlugs 재사용)
application/vault/  # buildBacklinkIndex.ts(신규) — Note[] -> Map<slug, Note[]>
components/organisms/  # NoteBacklinks(신규)
app/(browse)/       # 노트 상세 페이지 하단에 NoteBacklinks 추가
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 코딩 컨벤션 섹션 있음 (클린 아키텍처 + Atomic Design, 의존 방향 규칙)
- [x] ESLint 설정 있음
- [x] TypeScript 설정 있음

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists | `buildBacklinkIndex`, `NoteBacklinks` — 기존 `buildTagIndex`/`TagIndexList` 네이밍 패턴 준수 | High |
| **Folder structure** | exists | `application/vault/`, `components/organisms/`에 신규 파일 추가 (레이어 변경 없음) | High |

### 8.3 Environment Variables Needed

- 없음

### 8.4 Pipeline Integration

- 해당 없음 (9-phase Development Pipeline 미사용 프로젝트)

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`note-backlinks.design.md`) — 역인덱스 계산/전달 방식(페이지에서 직접 계산 vs 별도 캐싱 레이어)에 대한 3가지 아키텍처 옵션 비교
2. [ ] 구현 시작 (`/pdca do note-backlinks`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-07 | Initial draft | SY LEE |

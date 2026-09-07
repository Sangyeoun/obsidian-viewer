---
template: plan
version: 1.3
description: PDCA Plan phase document template with Context Anchor and Architecture considerations
variables:
  - feature: note-toc
  - date: 2026-09-07
  - author: SY LEE
  - project: obsidian-viewer
  - version: 0.1.0
---

# note-toc Planning Document

> **Summary**: 노트 상세 페이지 우측 빈 공간에, 본문의 `#` 헤딩을 파싱한 목차(TOC)를 고정 패널로 표시한다.
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
| **Problem** | 노트 상세 페이지는 좌측 사이드바 + 중앙 본문 2단 구조라 우측에 넓은 여백이 그대로 비어 있고, 긴 노트에서 원하는 섹션을 찾으려면 스크롤에만 의존해야 한다 |
| **Solution** | 노트 렌더링 시 이미 생성되는 헤딩(`rehypeSlug`가 부여한 id)을 기반으로 목차 데이터를 빌드 타임에 추출하고, 우측 고정(sticky) 패널에 렌더링한다 |
| **Function/UX Effect** | 우측 여백이 목차로 채워지고, 클릭 시 해당 섹션으로 이동하며, 스크롤에 따라 현재 위치가 하이라이트되어 긴 문서 탐색성이 향상된다 |
| **Core Value** | 별도 문서 재구조화 없이 기존 마크다운 파이프라인 산출물만으로 탐색 UX를 개선한다 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 노트 상세 페이지 우측 공간이 비어 있고, 긴 문서에서 섹션 탐색 수단이 없음 |
| **WHO** | vault 노트를 읽는 뷰어 사용자 (본인 및 노트 공유 대상) |
| **RISK** | 헤딩이 없는 노트/헤딩이 매우 많은 노트에서 레이아웃이 어색해질 수 있음 |
| **SUCCESS** | H1~H4 헤딩이 우측 패널에 목차로 표시되고, 클릭 시 해당 섹션으로 스크롤되며, 스크롤 중 현재 섹션이 하이라이트됨 |
| **SCOPE** | 목차 데이터 추출(인프라) → 우측 패널 컴포넌트(UI) → 액티브 하이라이트(클라이언트 인터랙션), 총 1 phase |

---

## 1. Overview

### 1.1 Purpose

노트 상세 페이지(`app/(browse)/notes/[...slug]/page.tsx`)의 레이아웃은 좌측 사이드바 + 중앙 `max-w-4xl` 본문으로 구성되어 있어, 넓은 화면에서 우측에 상당한 여백이 비어 있다. 이 공간에 현재 보고 있는 노트의 헤딩 구조를 파싱한 목차(TOC)를 표시하여 문서 탐색성을 높인다.

### 1.2 Background

- `infrastructure/markdown/markdownToHtml.ts`는 이미 `rehype-slug`를 사용해 모든 헤딩에 `id`를 부여하고 있다. TOC의 앵커 링크(`#id`) 기반은 이미 준비되어 있음.
- `domain/note/Note.ts`의 `Note` 엔티티는 `rawContent`(frontmatter 제외 원본 마크다운)와 `html`(렌더링 결과)을 모두 보유하고 있어, 헤딩 추출을 위한 원본 데이터 접근이 가능하다.
- 현재 `Note`에는 헤딩 목록 필드가 없으므로, 헤딩 파싱은 새로 추가해야 한다.

### 1.3 Related Documents

- 관련 기존 기능: `docs/02-design/features/split-pane-layout.design.md` (현재 2단 레이아웃의 근거)
- 마크다운 파이프라인: `infrastructure/markdown/markdownToHtml.ts`, `infrastructure/markdown/remarkWikilink.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] 노트 `rawContent`에서 `#`~`####` (H1~H4) 헤딩을 파싱해 `{ depth, text, id }[]` 형태의 목차 데이터 생성
- [ ] 헤딩 id는 기존 `rehype-slug`와 동일한 슬러그 규칙(github-slugger)으로 생성해 본문 앵커(`id="..."`)와 정확히 일치시킴
- [ ] `Note` 도메인 엔티티에 목차 데이터(`headings`) 필드 추가
- [ ] 노트 상세 페이지 레이아웃을 3단(사이드바 / 본문 / TOC)으로 확장, 우측에 `sticky` TOC 패널 추가
- [ ] TOC 항목 클릭 시 해당 헤딩으로 이동(앵커 링크)
- [ ] `IntersectionObserver` 기반 현재 스크롤 위치 헤딩 하이라이트 (클라이언트 컴포넌트)
- [ ] 헤딩이 없는 노트에서는 TOC 패널을 표시하지 않음(빈 박스 노출 방지)

### 2.2 Out of Scope

- 목차 항목 드래그 정렬, 접기/펼치기(collapse) 등 고급 인터랙션
- 모바일 반응형에서의 TOC 노출 방식 (기존 반응형 정책이 없으므로 데스크톱 우선, 별도 요청 시 후속 처리)
- 홈(`/`), 태그(`/tags`) 등 노트 본문이 없는 페이지에 대한 TOC 적용

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 노트 본문의 H1~H4 헤딩을 파싱하여 목차 리스트를 생성한다 | High | Pending |
| FR-02 | 목차 항목의 id는 본문 헤딩의 `id` 속성과 동일해야 한다 (rehype-slug와 동일 슬러그 알고리즘) | High | Pending |
| FR-03 | 노트 상세 페이지 우측에 목차를 고정(sticky) 패널로 표시한다 | High | Pending |
| FR-04 | 목차 항목 클릭 시 해당 헤딩 위치로 스크롤 이동한다 | High | Pending |
| FR-05 | 스크롤 중 현재 보이는 섹션의 목차 항목을 시각적으로 강조한다 | Medium | Pending |
| FR-06 | 헤딩이 하나도 없는 노트는 TOC 패널을 렌더링하지 않는다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|--------------------|
| Performance | 헤딩 파싱은 빌드 타임(정적 생성)에서 수행, 클라이언트 런타임 비용은 스크롤 하이라이트 로직에 한정 | 프로덕션 빌드 및 페이지 로드 확인 |
| Consistency | TOC 앵커 id가 본문 헤딩 id와 100% 일치 | 수동/코드 검증 (동일 슬러그 라이브러리 사용) |
| Accessibility | TOC는 `nav` 랜드마크와 목록 구조(`ol`/`ul`)로 마크업 | 코드 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] H1~H4 헤딩이 있는 노트에서 우측 TOC 패널이 표시된다
- [ ] TOC 클릭 시 해당 섹션으로 정확히 이동한다
- [ ] 스크롤 시 현재 섹션이 TOC에서 하이라이트된다
- [ ] 헤딩 없는 노트에서는 TOC 영역이 표시되지 않는다
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` 통과

### 4.2 Quality Criteria

- [ ] 기존 아키텍처 의존 방향(domain ← application ← infrastructure ← app) 유지
- [ ] Zero lint errors
- [ ] Build succeeds (283+ 라우트 정적 생성 유지)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| TOC id와 rehype-slug id 불일치 (중복 헤딩 텍스트 시 슬러그에 `-1`, `-2` 접미사 붙는 규칙 등) | High | Medium | 헤딩 파싱에도 `github-slugger`(rehype-slug와 동일 라이브러리)를 사용하고 카운터 상태를 초기화해 동일한 시퀀스로 slug 생성 |
| 헤딩이 매우 많은 노트에서 TOC가 지나치게 길어짐 | Low | Low | 이번 스코프에서는 스크롤 가능한 sticky 패널로 대응(접기 기능은 Out of Scope로 후속 처리) |
| 3단 레이아웃 추가로 좁은 화면에서 본문 폭이 줄어듦 | Medium | Medium | 우측 패널에 고정 폭(예: `w-56`)만 할당하고 본문은 `min-w-0`으로 유지해 기존 가독성 폭 보존 |

---

## 6. Impact Analysis

> **Purpose**: List every existing consumer of the resources being changed.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `Note` (domain entity) | Domain Type | `headings: readonly NoteHeading[]` 필드 추가 (신규 optional 아님, 항상 채워짐 — 빈 배열 가능) |
| `FileSystemNoteRepository.readNote` | Infrastructure | 노트 생성 시 헤딩 파싱 로직 호출 추가 |
| `app/(browse)/notes/[...slug]/page.tsx` | App Route | 레이아웃에 우측 TOC 패널 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `Note` | CREATE | `FileSystemNoteRepository.readNote` → `createNote(...)` | Breaking (createNote 파라미터 추가) — 호출부 1곳만 존재, 즉시 반영 |
| `Note` | READ | `app/(browse)/notes/[...slug]/page.tsx`, `application/vault/*` | None — 기존 필드는 그대로 유지, 신규 필드만 추가되므로 하위 호환 |
| `Note` | READ (mocks) | `mocks/` 목업 데이터 (테스트/스토리용) | Needs verification — 목업에 `headings` 필드 누락 시 타입 에러 발생 가능, 확인 필요 |

### 6.3 Verification

- [ ] `createNote` 호출부(단일 지점)가 새 `headings` 파라미터를 전달하도록 수정되었는지 확인
- [ ] `mocks/` 내 `Note` 목업 데이터에 `headings` 필드가 추가되었는지 확인 (타입체크로 검증됨)
- [ ] 기존 위키링크/콜아웃/해시태그 렌더링에 회귀가 없는지 확인

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
| 헤딩 파싱 위치 | remark 플러그인 vs `rawContent` 정규식 파싱 | remark 플러그인 (`infrastructure/markdown/`) | 이미 remark 파이프라인이 존재하고, mdast 트리에서 heading 노드를 순회하는 편이 정규식보다 정확함(코드블록 내부 `#` 오탐 방지) |
| 슬러그 생성 라이브러리 | 직접 슬러그 함수 vs `github-slugger` | `github-slugger` | `rehype-slug`가 내부적으로 사용하는 라이브러리와 동일 — id 불일치 리스크 제거 |
| TOC 렌더링 위치 | Design 단계에서 상세 결정 | (Design에서 결정) | 3가지 아키텍처 옵션 비교 필요 (하단 Next Steps 참고) |
| 상태 관리 | 없음 (스크롤 하이라이트는 로컬 client state) | React `useState`/`useEffect` | 전역 상태 불필요, 컴포넌트 로컬 상태로 충분 |
| Styling | Tailwind (기존 컨벤션) | Tailwind | 프로젝트 전체가 Tailwind 사용 중 |

### 7.3 Clean Architecture Approach

```
Selected Level: Enterprise (기존 구조 유지)

기존 구조:
domain/            # Note 엔티티에 headings 필드 추가
application/        # 필요 시 getNoteBySlug 등에서 그대로 통과
infrastructure/     # markdown/remarkExtractHeadings.ts(신규) + FileSystemNoteRepository 연동
components/
  atoms/            # (필요 시) TocLink 등 최소 단위
  molecules/        # TocList 등
  organisms/        # NoteToc (신규)
app/(browse)/       # 노트 상세 레이아웃에 우측 패널 추가
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 코딩 컨벤션 섹션 있음 (클린 아키텍처 + Atomic Design, 의존 방향 규칙)
- [ ] `docs/01-plan/conventions.md` 없음 (이 프로젝트 규모에서는 불필요)
- [x] ESLint 설정 있음
- [x] TypeScript 설정 있음

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists | `NoteHeading` 타입, `remarkExtractHeadings` 플러그인명 등 기존 네이밍 패턴(`remarkWikilink`, `remarkCallout`) 준수 | High |
| **Folder structure** | exists | `infrastructure/markdown/`에 신규 플러그인 파일 추가, `components/organisms/`에 `NoteToc` 추가 | High |
| **Import order** | exists | 기존 파일들과 동일한 import 순서 준수 | Low |

### 8.3 Environment Variables Needed

- 없음 (본 기능은 신규 환경변수를 필요로 하지 않음)

### 8.4 Pipeline Integration

- 해당 없음 (9-phase Development Pipeline 미사용 프로젝트)

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`note-toc.design.md`) — 헤딩 파싱 방식(remark 플러그인 vs 별도 유틸)과 TOC 컴포넌트 구조에 대한 3가지 아키텍처 옵션 비교
2. [ ] `createNote`/`Note` 타입 변경에 따른 `mocks/` 데이터 영향 범위 확인
3. [ ] 구현 시작 (`/pdca do note-toc`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-07 | Initial draft | SY LEE |

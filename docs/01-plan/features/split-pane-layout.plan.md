---
template: plan
version: 1.3
---

# split-pane-layout Planning Document

> **Summary**: 홈 화면을 좌측 노트 목록 + 중앙 노트 상세를 함께 보여주는 2단(split-pane) 레이아웃으로 전환한다.
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
| **Problem** | 현재는 홈(`/`)에서 노트를 클릭하면 `/notes/[...slug]`로 전체 페이지 이동이 일어나, 목록과 본문을 동시에 볼 수 없고 매번 뒤로가기가 필요하다. |
| **Solution** | 홈을 좌측(검색+목록) / 중앙(선택된 노트 본문) 2단 레이아웃으로 바꾸고, 목록 클릭 시 클라이언트 사이드에서 URL만 `/notes/[slug]`로 바뀌며 같은 레이아웃 안에서 중앙 영역만 갱신되게 한다. |
| **Function/UX Effect** | Obsidian 데스크톱 앱과 유사하게 목록을 유지한 채 여러 노트를 빠르게 넘나들며 읽을 수 있다. |
| **Core Value** | 탐색 마찰이 줄어 vault 노트를 빠르게 훑어보는 뷰어 본연의 목적에 더 부합한다. |

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

### 1.1 Purpose

노트 목록과 노트 본문을 하나의 화면에서 동시에 보여주는 2단(split-pane) 레이아웃을 도입해, 페이지 전환 없이 여러 노트를 빠르게 탐색할 수 있게 한다.

### 1.2 Background

기존 UX는 카드 그리드 홈 화면 → 노트 클릭 → 전체 페이지 이동(`/notes/[...slug]`) → 뒤로가기 → 다시 목록, 순서로 동작한다. Obsidian 데스크톱 앱이나 일반적인 노트 뷰어(예: Notion 사이드바)는 목록을 항상 좌측에 고정하고 본문만 바꿔 보여주는 방식을 취하는데, 사용자가 이 패턴으로 전환을 요청했다.

### 1.3 Related Documents

- 관련 기존 기능: `docs/02-design/features/vault-recursive-read.design.md` (slug/라우트 구조)

---

## 2. Scope

### 2.1 In Scope

- [ ] `/` 라우트를 좌측(검색+목록) / 중앙(선택 노트 상세) 2단 레이아웃으로 전면 교체
- [ ] `/notes/[...slug]` 방문 시에도 동일한 2단 레이아웃 안에서 해당 노트가 중앙에 표시되도록 라우트 그룹/공유 레이아웃 구성
- [ ] 좌측 목록 클릭 시 페이지 전체 새로고침 없이 중앙 영역만 갱신 (Next.js 클라이언트 네비게이션 활용)
- [ ] 검색창을 좌측 사이드바 상단으로 이동, 필터링된 목록을 사이드바 폭에 맞는 리스트 아이템으로 표시
- [ ] 노트를 선택하지 않은 상태(엣지 케이스)에서 중앙에 안내 문구 표시
- [ ] `PageLayout`의 `max-w-3xl` 제약이 2단 레이아웃에 미치는 영향 검토 및 조정

### 2.2 Out of Scope

- `/tags`, `/tags/[tag]` 페이지의 레이아웃 변경
- 모바일 반응형(좁은 화면에서 좌/중 분할을 어떻게 접을지)에 대한 별도 최적화 — 필요 시 후속 작업으로 분리
- 리사이즈 가능한 사이드바 폭 조절 UI

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `/` 접속 시 좌측에 검색창 + 전체 노트 목록, 중앙에 안내 문구(빈 상태)가 보인다 | High | Pending |
| FR-02 | 좌측 목록에서 노트를 클릭하면 중앙 영역에 해당 노트 본문이 렌더링되고 URL이 `/notes/{slug}`로 바뀐다 | High | Pending |
| FR-03 | `/notes/{slug}` URL로 직접 진입(새로고침 포함)해도 동일한 2단 레이아웃과 좌측 목록, 중앙 해당 노트가 함께 보인다 | High | Pending |
| FR-04 | 좌측 검색창에 입력하면 목록이 필터링되며, 현재 선택된 노트 표시 상태는 유지된다 | Medium | Pending |
| FR-05 | 좌측 목록에서 현재 선택된(중앙에 표시 중인) 노트는 시각적으로 강조 표시된다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 빌드 방식 유지 | 기존처럼 정적 생성(SSG) 기반 유지, 별도 서버 API 불필요 | `pnpm build` 성공 확인 |
| 접근성 | 목록 항목 클릭이 키보드로도 접근 가능한 링크/버튼이어야 함 | 수동 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/`, `/notes/{slug}` 모두 동일한 2단 레이아웃 컴포넌트를 공유
- [ ] 좌측 목록 클릭 → 중앙 갱신 + URL 변경 정상 동작
- [ ] 검색 필터링이 2단 레이아웃에서도 정상 동작
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과
- [ ] 실제 VAULT_DIR(264개 노트)로 빌드 후 목록 스크롤/선택/검색 수동 확인

### 4.2 Quality Criteria

- [ ] 빌드 성공, lint/typecheck 오류 없음
- [ ] 기존 `/tags` 페이지 및 링크 정상 동작 유지(회귀 없음)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `/`와 `/notes/[...slug]`가 서로 다른 라우트 세그먼트라 레이아웃 공유가 Next.js App Router 구조상 까다로울 수 있음 | Medium | Medium | Next.js Route Groups(`(main)` 등)와 공유 `layout.tsx`로 두 라우트를 같은 레이아웃 트리 아래 배치 — Design 단계에서 구체적 폴더 구조 확정 |
| 264개 노트 전체를 좌측 목록에 클라이언트에서 렌더링 시 성능 저하 가능 | Low | Low | 기존에도 `NoteSearch`가 클라이언트에서 전체 목록을 다루고 있어 동일 규모이므로 기존 대비 추가 저하 없음 |
| 정적 생성(SSG) 특성상 "선택 상태"를 URL로만 표현해야 함(서버 상태 없음) | Medium | Low | 중앙 콘텐츠는 여전히 URL(slug)에서 결정하고, 좌측 목록은 클라이언트 컴포넌트로 유지 — 기존 아키텍처와 정합 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `app/page.tsx` | 라우트 | 카드 그리드 → 2단 레이아웃의 "선택 없음" 상태로 대체 |
| `app/notes/[...slug]/page.tsx` | 라우트 | 전체 페이지 → 2단 레이아웃의 "중앙 콘텐츠"로 대체 |
| `PageLayout` | 템플릿 컴포넌트 | `/`, `/notes` 전용의 새 2단 레이아웃과 기존 `/tags` 등에서 쓰는 단일 컬럼 레이아웃을 분리 |
| `NoteList`, `NoteCard` | 컴포넌트 | 사이드바 폭에 맞는 목록 아이템 형태로 조정 또는 대체 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `PageLayout` | READ | `app/tags/page.tsx`, `app/tags/[tag]/page.tsx` | 그대로 유지되어야 함 — `/`, `/notes`만 새 레이아웃 사용하도록 분리 필요 |
| `NoteCard` | READ | 현재 `NoteList`에서만 사용 | 2단 사이드바용 목록 아이템이 별도로 필요하면 `NoteCard`는 그대로 두고 신규 컴포넌트 추가, 또는 `NoteCard`를 컨텍스트에 따라 조정 (Design 단계에서 결정) |
| `SiteHeader` | READ | `PageLayout` 내부 | 2단 레이아웃에서도 상단 헤더 유지 여부 결정 필요 |

### 6.3 Verification

- [ ] `/tags`, `/tags/[tag]` 페이지가 기존과 동일하게 단일 컬럼으로 유지되는지 확인
- [ ] 새 2단 레이아웃 도입이 기존 `PageLayout` 사용처에 영향을 주지 않는지 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Enterprise** (클린 아키텍처, 기존 유지) | 계층 분리, domain/application/infrastructure | 이 프로젝트의 기존 구조 | ☑ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 라우트 구조 | `/`와 `/notes/[slug]`를 완전히 별개로 유지 vs Route Group으로 레이아웃 공유 | Route Group으로 레이아웃 공유 (Design 단계에서 구체화) | 2단 레이아웃을 두 라우트에서 재사용하고 URL 기반 정적 생성을 유지하기 위함 |
| 선택 상태 관리 | 클라이언트 전역 상태(Context/Zustand) vs URL(slug) 기반 | URL 기반 | 정적 사이트 특성 유지, 새로고침/직접 진입 시에도 동일하게 동작해야 하므로 |

### 7.3 Clean Architecture Approach

```
기존 계층 구조 유지. 변경 범위는 app/(라우트, 레이아웃)과 components/organisms,
components/templates로 국한. domain/application/infrastructure는 변경 없음
(이미 조회된 Note 목록/상세를 다르게 배치하는 프레젠테이션 레이어 변경).
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 코딩 컨벤션 섹션 존재 (Atomic Design: atoms/molecules/organisms/templates)
- [x] ESLint/TypeScript 설정 존재

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| 2단 레이아웃 템플릿 위치 | 없음 | `components/templates/` 하위에 신규 템플릿 추가 여부 | High |

### 8.3 Environment Variables Needed

신규 환경변수 없음.

---

## 9. Next Steps

1. [ ] `/pdca design split-pane-layout` 로 설계 문서 작성 (Route Group 구조, 컴포넌트 분해 확정)
2. [ ] 구현 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

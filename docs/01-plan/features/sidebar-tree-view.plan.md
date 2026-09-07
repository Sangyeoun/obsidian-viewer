---
template: plan
version: 1.3
---

# sidebar-tree-view Planning Document

> **Summary**: 좌측 사이드바를 폴더 구조 접기/펼치기가 가능한 트리 뷰로 바꾸고, 사이드바를 브라우저 창 최좌단에 고정한다.
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
| **Problem** | 현재 사이드바는 264개 노트를 폴더 구분 없이 평면 목록으로 나열해 원하는 노트를 찾기 어렵고, 사이드바 위치도 중앙 컨텐츠 컨테이너 안에 갇혀 있어 화면 공간 활용이 비효율적이다. |
| **Solution** | slug의 `/` 구분을 이용해 폴더/파일 트리 구조를 만들고 폴더는 클릭으로 접고 펼칠 수 있게 하며, 사이드바를 `max-w-6xl` 컨테이너 밖으로 빼내 브라우저 창 최좌단에 고정한다. |
| **Function/UX Effect** | Obsidian 파일 탐색기와 유사한 방식으로 폴더별로 노트를 찾을 수 있고, 사이드바가 화면 가장자리에 고정되어 중앙 콘텐츠 영역이 더 넓어진다. |
| **Core Value** | 264개 노트 규모에서도 원하는 노트를 빠르게 찾을 수 있는 탐색성이 확보된다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 평면 목록은 노트가 많을수록(현재 264개) 원하는 항목을 찾기 어렵고, 사이드바가 중앙 컨테이너에 종속되어 있어 화면 낭비가 있음 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) — 폴더별로 분류된 자신의 vault를 탐색 |
| **RISK** | 트리 구조의 접힘/펼침 상태를 어떻게 유지할지(세션 중 유지 vs 매번 초기화)에 따라 구현 복잡도가 달라짐 |
| **SUCCESS** | 사이드바에서 폴더를 클릭해 하위 항목을 접고 펼칠 수 있고, 사이드바가 브라우저 창 좌측 끝에 고정되어 보임 |
| **SCOPE** | `NoteSidebar`/`NoteListItem` 트리 구조 전환, `app/(browse)/layout.tsx`의 사이드바 배치 방식 변경. 검색 기능과의 상호작용(검색 시 트리를 평면으로 되돌릴지 등) 포함 |

---

## 1. Overview

### 1.1 Purpose

사이드바를 폴더 트리 구조로 전환해 탐색성을 높이고, 사이드바 위치를 화면 최좌단으로 이동해 레이아웃을 개선한다.

### 1.2 Background

`split-pane-layout` 구현 직후 실제 264개 노트로 사용해보니, 평면 목록은 스크롤이 길어 특정 노트를 찾기 어렵다는 피드백을 받았다. 또한 사이드바가 `app/(browse)/layout.tsx`의 `max-w-6xl mx-auto` 컨테이너 안에 있어, 넓은 화면에서도 사이드바가 중앙에 몰려 보이고 좌우 여백이 낭비되는 문제가 있었다.

### 1.3 Related Documents

- 관련 기존 기능: `docs/02-design/features/split-pane-layout.design.md` (현재 사이드바 구조)
- 관련 기존 기능: `docs/02-design/features/vault-recursive-read.design.md` (slug의 폴더 경로 구조)

---

## 2. Scope

### 2.1 In Scope

- [ ] slug(`/` 구분)를 파싱해 폴더/파일 계층 트리 데이터 구성
- [ ] 폴더 노드는 클릭 시 하위 항목을 접고 펼칠 수 있음
- [ ] 파일 노드는 기존과 동일하게 클릭 시 해당 노트로 이동, 현재 선택 강조 유지
- [ ] 검색어 입력 시 트리 vs 평면 목록 중 어떤 방식으로 결과를 보여줄지 결정 및 구현
- [ ] 사이드바를 `app/(browse)/layout.tsx`의 `max-w-6xl` 컨테이너 밖으로 이동해 브라우저 창 최좌단에 고정
- [ ] 현재 선택된 노트로 이어지는 폴더 경로는 기본적으로 펼쳐진 상태로 시작

### 2.2 Out of Scope

- 드래그 앤 드롭으로 노트/폴더 재배치
- 사이드바 폭 리사이즈 UI
- 폴더별 노트 개수 뱃지 표시

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사이드바가 vault의 폴더 구조를 반영한 트리로 표시된다 | High | Pending |
| FR-02 | 폴더 노드를 클릭하면 하위 항목이 접히거나 펼쳐진다 | High | Pending |
| FR-03 | 현재 선택된(중앙에 표시 중인) 노트까지의 폴더 경로는 자동으로 펼쳐진 상태로 보인다 | Medium | Pending |
| FR-04 | 검색어 입력 시 일치하는 노트가 포함된 폴더만 자동으로 펼쳐져 결과가 보인다 | Medium | Pending |
| FR-05 | 사이드바가 브라우저 창의 좌측 가장자리에 고정되어 표시된다 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 빌드 방식 유지 | 정적 생성(SSG) 기반 유지 | `pnpm build` 성공 확인 |
| 접근성 | 폴더 접기/펼치기 버튼이 키보드로 접근 가능해야 함 | 수동 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 264개 노트가 폴더 트리로 정상 표시됨
- [ ] 폴더 클릭 시 접기/펼치기 정상 동작
- [ ] 사이드바가 화면 최좌단에 고정됨
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과
- [ ] 실제 VAULT_DIR로 빌드 후 브라우저에서 트리 탐색/검색/레이아웃 수동 확인

### 4.2 Quality Criteria

- [ ] 빌드 성공, lint/typecheck 오류 없음
- [ ] 기존 `split-pane-layout`의 선택 강조, URL 기반 상태 유지 등 회귀 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 접힘/펼침 상태가 노트 이동마다 초기화되면 사용성이 나빠질 수 있음 | Medium | Medium | 접힘 상태를 클라이언트 상태(localStorage 또는 컴포넌트 상태)로 유지하는 방식을 Design 단계에서 결정 |
| 트리 구조 변환 로직이 복잡해질 수 있음(264개 노트, 깊은 폴더 구조) | Low | Low | 순수 함수로 slug 배열 → 트리 변환 로직을 분리해 테스트 가능하게 구성 |
| 사이드바를 화면 최좌단으로 빼면 기존 `max-w-6xl` 중앙 정렬 레이아웃과 시각적 균형이 깨질 수 있음 | Low | Medium | 중앙 콘텐츠 영역의 폭 제약을 재조정 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `NoteSidebar` | 컴포넌트 | 평면 목록 렌더링 → 트리 렌더링 + 접기/펼치기 상태 관리 |
| `NoteListItem` | 컴포넌트 | 파일 노드 전용으로 축소, 폴더 노드는 별도 컴포넌트 신설 |
| `app/(browse)/layout.tsx` | 라우트 레이아웃 | 사이드바를 `max-w-6xl` 컨테이너 밖, 화면 최좌단으로 배치 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `NoteSidebar` | READ | `app/(browse)/layout.tsx` | props 인터페이스 유지 여부는 Design 단계에서 확정, 사용처는 이 한 곳뿐 |
| `searchNotes` | READ | `NoteSidebar` 내부 | 검색 필터링 로직은 재사용, 결과를 트리에 어떻게 반영할지만 추가 로직 필요 |

### 6.3 Verification

- [ ] 검색 필터링이 트리 구조에서도 정상 동작하는지 확인
- [ ] 노트 선택 강조(`aria-current`)가 트리 파일 노드에서도 유지되는지 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Enterprise** (클린 아키텍처, 기존 유지) | 계층 분리 | 이 프로젝트의 기존 구조 | ☑ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 트리 데이터 변환 위치 | `NoteSidebar` 내부 인라인 vs `application/vault/`에 순수 함수 분리 | Design 단계에서 결정 | 기존 `buildTagIndex`, `searchNotes`처럼 application 레이어에 순수 함수로 두는 기존 패턴과의 일관성 검토 |
| 접힘 상태 저장 위치 | 컴포넌트 로컬 상태 vs localStorage | Design 단계에서 결정 | 새로고침 후에도 상태를 유지할지 여부에 따라 결정 |
| 사이드바 배치 방식 | `position: fixed` vs 레이아웃 그리드 재구성 | Design 단계에서 결정 | 헤더와의 상호작용, 스크롤 동작을 고려해 결정 |

### 7.3 Clean Architecture Approach

```
기존 계층 구조 유지. 트리 변환 로직이 순수 함수라면 application/vault/에,
컴포넌트 자체는 presentation(components/organisms)에 위치.
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 Atomic Design 컨벤션 존재
- [x] `application/vault/`에 순수 함수 유스케이스를 두는 기존 패턴 존재(`searchNotes`, `buildTagIndex`)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| 트리 노드 타입 정의 | 없음 | 폴더/파일 노드를 표현하는 타입 | High |

### 8.3 Environment Variables Needed

신규 환경변수 없음.

---

## 9. Next Steps

1. [ ] `/pdca design sidebar-tree-view` 로 설계 문서 작성 (트리 데이터 구조, 접힘 상태 관리 방식, 레이아웃 배치 확정)
2. [ ] 구현 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

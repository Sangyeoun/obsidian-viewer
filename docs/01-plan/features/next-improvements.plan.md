---
template: plan
version: 1.3
---

# next-improvements Planning Document

> **Summary**: 초기 뷰어 구현 완료 후, 실사용 관점에서 확인된 3가지 갭(검색, VAULT_DIR 연동, 태그 인덱스/링크 무결성)을 해소한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-08-21
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 노트가 늘어나면 목록 스크롤만으로 원하는 노트를 찾기 어렵고, vault 경로가 하드코딩되어 있으며, 태그 전체를 조망하거나 끊긴 위키링크를 확인할 방법이 없다 |
| **Solution** | 클라이언트 사이드 검색(제목/본문 기반), `VAULT_DIR` 환경변수 실연동, `/tags` 인덱스 페이지와 끊긴 링크 감지를 추가한다 |
| **Function/UX Effect** | 노트 탐색 속도 향상(검색), vault 위치 유연성 확보(VAULT_DIR), 태그 전체 조망 및 위키링크 오탈자 조기 발견 가능 |
| **Core Value** | 노트 수가 늘어나도 뷰어의 탐색성과 신뢰성(끊긴 링크 없음)을 유지 |

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

### 1.1 Purpose

초기 구현(`fe084b4`, `948df8a`)으로 완성된 노트 목록/상세/태그/위키링크/콜아웃 렌더링 위에, 노트 수가 늘어났을 때도 사용성과 데이터 무결성을 유지하기 위한 3가지 개선을 추가한다.

### 1.2 Background

현재 `README.md`와 `.env.example`은 `VAULT_DIR`을 문서화하고 있으나 `FileSystemNoteRepository`는 이를 참조하지 않아 문서와 구현이 불일치한다. 또한 `/tags/[tag]`는 개별 태그 페이지만 있고 전체 태그 목록에 접근할 경로가 없다. 위키링크(`remarkWikilink`)가 존재하지 않는 슬러그를 가리킬 때의 동작도 검증되지 않았다. 노트 목록은 스크롤 외 탐색 수단이 없다.

### 1.3 Related Documents

- Related: `README.md`, `CLAUDE.md`, `.env.example`
- Prior work: `fe084b4` (초기 구현), `948df8a` (Claude Code 설정)

---

## 2. Scope

### 2.1 In Scope

- [ ] 클라이언트 사이드 검색: 노트 제목/본문 텍스트 기반 필터링 UI
- [ ] `VAULT_DIR` 환경변수를 `FileSystemNoteRepository`가 실제로 읽도록 연동
- [ ] `/tags` 전체 태그 인덱스 페이지 (태그별 노트 수 표시)
- [ ] 위키링크 무결성 검사: 존재하지 않는 슬러그를 가리키는 링크를 빌드 타임에 감지(경고 로그) 및 렌더링 시 시각적 구분(끊긴 링크 스타일)

### 2.2 Out of Scope

- 테스트 인프라 구축 (별도 feature로 분리, 이번 Plan에서 제외)
- 서버 사이드/풀텍스트 검색 엔진 도입 (Algolia, Elasticsearch 등)
- 노트 페이지네이션/정렬 UI (스코프 외, 필요 시 후속 Plan)
- vault 콘텐츠 자체의 CRUD(생성/수정 UI)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 홈페이지에 검색 입력창을 추가하고, 입력 시 제목 또는 본문에 매칭되는 노트만 노출한다 | High | Pending |
| FR-02 | `FileSystemNoteRepository`는 `process.env.VAULT_DIR`이 설정된 경우 해당 경로를, 없으면 기존처럼 `vault/`를 사용한다 | High | Pending |
| FR-03 | `/tags` 경로에서 전체 태그와 각 태그별 노트 수를 목록으로 보여준다 | Medium | Pending |
| FR-04 | `remarkWikilink`가 생성한 링크 중 대상 슬러그가 존재하지 않으면 빌드 로그에 경고를 남기고, 렌더링 시 끊긴 링크임을 시각적으로 구분한다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 검색은 클라이언트 사이드 필터링으로 입력 후 UI 반응 지연 없음 | 수동 확인 (노트 수 기준 체감) |
| Compatibility | 기존 `vault/*.md` 콘텐츠와 라우팅(`/notes/[slug]`, `/tags/[tag]`)은 변경 없이 동작 | `pnpm build` 후 기존 경로 정상 렌더링 확인 |
| Type Safety | 신규/변경 코드는 `pnpm typecheck` 통과 | `pnpm typecheck` 결과 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-04 모두 구현
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` 모두 통과
- [ ] 기존 페이지(`/`, `/notes/[slug]`, `/tags/[tag]`) 동작에 회귀 없음
- [ ] README에 검색/VAULT_DIR/태그 인덱스 사용법 반영

### 4.2 Quality Criteria

- [ ] 신규 로직(링크 무결성 검사, 검색 필터)에 대해 최소한의 수동 검증 시나리오 문서화 (테스트 러너 부재로 자동화 테스트는 Out of Scope)
- [ ] Zero lint errors
- [ ] Build 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 검색을 위해 전체 노트 본문을 클라이언트 번들에 포함하면 노트가 많아질 때 번들 크기 증가 | Medium | Medium | 검색 인덱스는 제목 + 본문 요약(예: 앞 200자)만 포함하거나, 노트 수 임계치를 넘으면 별도 개선 필요함을 문서화 |
| `VAULT_DIR`을 절대/상대 경로 어느 쪽이든 받게 하면 경로 탐색(path traversal) 우려 | Low | Low | 빌드 타임 전용 설정값이며 사용자 입력이 아니므로 CLAUDE.md 보안 원칙상 낮은 우선순위지만, `path.resolve` 사용으로 정규화 |
| 링크 무결성 검사가 기존 콜아웃/해시태그 플러그인과 충돌 | Low | Low | `remarkWikilink` 파이프라인 내 기존 노트 슬러그 목록을 파라미터로 주입하는 기존 패턴 재사용 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `infrastructure/filesystem/FileSystemNoteRepository.ts` | Infrastructure | `VAULT_DIR` 환경변수 참조 추가 |
| `infrastructure/markdown/remarkWikilink.ts` | Infrastructure | 존재하지 않는 슬러그 감지 로직 추가 |
| `application/vault/listNotes.ts` | Application | 검색/태그 인덱스에 필요한 데이터 형태 검토 (필요 시 확장) |
| `app/page.tsx` | App Route | 검색 입력 UI 추가 |
| `app/tags/page.tsx` (신규) | App Route | 태그 인덱스 페이지 신규 생성 |
| `components/` | UI | 검색 입력 컴포넌트(atom/molecule) 신규 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `FileSystemNoteRepository` | READ | `application/vault/vaultRepository.ts` → 컴포지션 루트 | None — 환경변수 미설정 시 기존 동작 유지 |
| `listNotes` | READ | `app/page.tsx`, `app/tags/[tag]/page.tsx` | Needs verification — 검색용 데이터 형태 추가 시 반환 타입 변경 여부 확인 |
| `remarkWikilink` | READ | `infrastructure/markdown/markdownToHtml.ts` | Needs verification — 슬러그 목록 주입 방식 변경 시 파이프라인 호출부 수정 필요 |

### 6.3 Verification

- [ ] `VAULT_DIR` 미설정 시 기존 `vault/*.md` 렌더링 결과가 이전과 동일함을 확인
- [ ] 기존 위키링크(`[[project-ideas]]` 등)가 무결성 검사 도입 후에도 정상 링크로 처리됨을 확인
- [ ] `/tags/[tag]` 개별 페이지가 `/tags` 인덱스 추가 후에도 정상 동작함을 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☐ |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | ☑ (기존 클린 아키텍처 유지) |

> 본 프로젝트는 이미 클린 아키텍처(domain/application/infrastructure) + Atomic Design 구조를 채택했으므로, 이번 개선도 동일 구조를 따른다. bkit 레벨 분류상 "Enterprise"가 아니라 기존 구조를 그대로 따르는 것이 핵심이다.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 검색 구현 위치 | Server Component 필터링 / Client Component 필터링 | Client Component | 정적 빌드 후 클라이언트에서 즉시 반응해야 하므로 |
| VAULT_DIR 처리 | `process.env` 직접 참조 / 별도 config 모듈 | `infrastructure` 레이어 내 처리 | domain은 프레임워크/환경 비의존 원칙 유지 |
| 링크 무결성 검사 시점 | 빌드 타임(remark 플러그인) / 런타임 | 빌드 타임 | 정적 사이트 특성상 빌드 시점에 전체 슬러그 목록 확보 가능 |
| Styling | Tailwind (기존 유지) | Tailwind | 기존 컨벤션과 일관성 |

### 7.3 Clean Architecture Approach

```
Selected Level: 기존 구조 유지 (Clean Architecture + Atomic Design)

domain/            변경 없음 (Note 엔티티는 프레임워크 비의존 유지)
application/       listNotes 등 유스케이스 — 검색/태그 인덱스용 데이터 조합은 여기서 처리
infrastructure/    FileSystemNoteRepository(VAULT_DIR), remarkWikilink(링크 무결성) 변경
components/atoms   SearchInput 등 신규 원자 컴포넌트
components/organisms  검색 결과 목록, 태그 인덱스 목록
app/               app/page.tsx(검색 통합), app/tags/page.tsx(신규)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section (프로젝트 루트에 존재)
- [ ] `docs/01-plan/conventions.md` exists (없음 — CLAUDE.md가 대체)
- [ ] `CONVENTIONS.md` exists at project root (없음)
- [x] ESLint configuration (`eslint.config.*` — Next.js 16 기본)
- [ ] Prettier configuration (없음 — 별도 도입하지 않음)
- [x] TypeScript configuration (`tsconfig.json`)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists (camelCase 함수, PascalCase 컴포넌트) | 신규 파일도 동일 컨벤션 적용 | High |
| **Folder structure** | exists (도메인별 레이어 분리) | 신규 컴포넌트도 atoms/organisms 분류 유지 | High |
| **Import order** | exists (`@/` alias 사용 중) | 동일하게 유지 | Medium |
| **Environment variables** | missing (VAULT_DIR 문서만 존재) | `VAULT_DIR` 실제 사용 및 `.env.example` 최신화 | High |
| **Error handling** | exists (에러 없이 조용히 넘어가는 패턴 지양) | VAULT_DIR 경로 미존재 시 명확한 에러 메시지 | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `VAULT_DIR` | Obsidian vault 마크다운 폴더 경로 (빌드 타임) | Server (build-time) | ☑ (기존 문서화만 되어 있음 — 실제 연동 필요) |

### 8.4 Pipeline Integration

이 프로젝트는 9-phase Development Pipeline을 별도로 운영하지 않음 (단일 뷰어 애플리케이션, Phase 문서 없음). 해당 없음.

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`next-improvements.design.md`) — 검색 UI 배치, VAULT_DIR 검증 로직, 태그 인덱스 페이지 구조, 링크 무결성 검사 설계
2. [ ] 사용자 검토 및 승인
3. [ ] 구현 시작 (`/pdca do next-improvements`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-21 | Initial draft | SY LEE |

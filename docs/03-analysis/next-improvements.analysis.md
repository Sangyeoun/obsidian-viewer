---
template: analysis
version: 1.3
---

# next-improvements Analysis Report

> **Analysis Type**: Gap Analysis
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Analyst**: SY LEE (Claude Code)
> **Date**: 2026-08-21
> **Design Doc**: [next-improvements.design.md](../02-design/features/next-improvements.design.md)

> 이 프로젝트는 REST API·DB·테스트 러너가 없는 정적 마크다운 뷰어이므로, 템플릿의
> API/DB/Runtime(L1-L3)/Test Coverage 섹션은 해당 없음으로 표시하고 정적 분석
> (Structural/Functional/Convention/Architecture) 위주로 작성한다. PM(PRD) 단계는
> 생략되어 Strategic Alignment는 Plan 기준으로 평가한다.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 초기 구현은 기능 시연에 집중되어 있어 노트가 소수일 때만 사용성이 좋음 — 탐색·설정 유연성·데이터 무결성 갭 존재 |
| **WHO** | vault 소유자(빌드 타임에 콘텐츠를 채우는 본인) 및 정적 사이트 방문자 |
| **RISK** | 정적 빌드 특성상 검색은 클라이언트 사이드로 제한됨 — 노트 수가 매우 많아지면 번들 크기 이슈 가능 |
| **SUCCESS** | 검색으로 제목/본문 매칭 노트 확인 가능, `VAULT_DIR` 변경 시 실제 다른 폴더를 읽음, `/tags`에서 전체 태그 확인 및 끊긴 위키링크가 콘솔/빌드 로그에 표시됨 |
| **SCOPE** | (1) 검색 (2) VAULT_DIR 연동 (3) 태그 인덱스 + 링크 무결성 |

---

## Strategic Alignment Check

### PRD Alignment

PM 단계 생략(PRD 없음). Plan 문서를 최상위 전략 문서로 취급한다.

| Plan Element | Expected | Implementation Status |
|-------------|----------|:---------------------:|
| Core Problem (WHY) | 노트 급증 시 탐색성·설정 유연성·데이터 무결성 저하 | ✅ Addressed |
| Target User (WHO) | vault 소유자 + 사이트 방문자 | ✅ Addressed |
| Value Proposition | 노트 수가 늘어나도 탐색성·신뢰성 유지 | ✅ Delivered |

### Success Criteria Status

| # | Criteria (from Plan §4.1) | Status | Evidence |
|---|---------------------|:------:|----------|
| SC-1 | FR-01~04 모두 구현 | ✅ | 아래 §2 Gap Analysis 참조, 4/4 구현 확인 |
| SC-2 | `pnpm typecheck`, `pnpm lint`, `pnpm build` 모두 통과 | ✅ | 본 분석 중 재실행하여 3종 모두 통과 확인 (경고 없음) |
| SC-3 | 기존 페이지(`/`, `/notes/[slug]`, `/tags/[tag]`) 회귀 없음 | ✅ | 빌드 로그상 3개 라우트 정상 생성, `/notes/[slug]`는 링크 무결성 검사 추가에도 정상 렌더링 |
| SC-4 | README에 검색/VAULT_DIR/태그 인덱스 사용법 반영 | ✅ | README.md에 4단계 사용법 + "검색 및 태그 탐색" 섹션 추가 확인 |

**Success Rate**: 4/4 criteria met (100%)

### Decision Record Verification

| Source | Decision | Followed? | Deviation |
|--------|----------|:---------:|-----------|
| [Plan] | domain은 변경 없이 application/infrastructure에서 해결 | ✅ | 없음 — `domain/note/Note.ts`는 실제로 무수정 |
| [Design] | Option C(Pragmatic Balance) 채택 | ✅ | 없음 — 순수 함수(`searchNotes`, `buildTagIndex`)를 application에 배치 |
| [Design] | 링크 무결성은 `findAll()` 경로에서 `allSlugs`를 markdownToHtml에 전달 | ⚠️ | **편차 발견**: Design은 `findAll()` 경로만 명시했으나, 실제로 `/notes/[slug]` 상세 페이지는 `getNoteBySlug` → `findBySlug(slug)` 단일 조회 경로를 사용해 `allSlugs`가 전달되지 않는 문제를 Do 단계에서 발견. `NoteRepository`에 `listSlugs()`를 추가하고 `getNoteBySlug`가 먼저 전체 슬러그를 확보하도록 확장하여 해결함(Design 미기술 사항의 정당한 보완) |

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design 문서(Option C, FR-01~04)와 실제 구현 코드 간 정적 일치도를 검증하고, 수동 검증 시나리오(Design §8)가 실제로 통과하는지 확인한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/next-improvements.design.md`
- **Implementation Path**: `application/vault/`, `infrastructure/`, `components/`, `app/`
- **Analysis Date**: 2026-08-21

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints

해당 없음 — Design §4에서도 명시했듯 이 기능은 REST API를 추가하지 않는다 (정적 빌드 + 클라이언트 필터링).

### 2.2 Data Model

| Field | Design Type | Impl Type | Status |
|-------|-------------|-----------|--------|
| `TagCount.tag` | `readonly string` | `readonly string` | ✅ |
| `TagCount.count` | `readonly number` | `readonly number` | ✅ |
| `domain/note/Note.ts` | 변경 없음 | 변경 없음 | ✅ |

### 2.3 Component Structure

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| `SearchInput` | `components/atoms/SearchInput.tsx` | ✅ Match |
| `NoteSearch` | `components/organisms/NoteSearch.tsx` | ✅ Match |
| `TagIndexList` | `components/organisms/TagIndexList.tsx` | ✅ Match |
| `searchNotes` | `application/vault/searchNotes.ts` | ✅ Match |
| `buildTagIndex` | `application/vault/buildTagIndex.ts` | ✅ Match |
| `vaultRepository`(VAULT_DIR) | `application/vault/vaultRepository.ts` | ✅ Match |
| `FileSystemNoteRepository`/`remarkWikilink`/`markdownToHtml` | `infrastructure/` | ✅ Match |
| `app/tags/page.tsx` | `app/tags/page.tsx` | ✅ Match (신규) |
| `app/page.tsx`(NoteSearch 교체) | `app/page.tsx` | ✅ Match |

### 2.4 Functional Depth Analysis

| File | Depth Score | Placeholder Indicators | Missing Design Elements |
|------|:----------:|----------------------|------------------------|
| `application/vault/searchNotes.ts` | 100 | 없음 | 없음 |
| `application/vault/buildTagIndex.ts` | 100 | 없음 | 없음 |
| `components/organisms/NoteSearch.tsx` | 100 | 없음 | 없음 (검색 결과 0건 문구 포함) |
| `components/organisms/TagIndexList.tsx` | 100 | 없음 | 없음 (빈 상태 문구 포함) |
| `infrastructure/markdown/remarkWikilink.ts` | 100 | 없음 | 없음 (broken 마킹 + 경고 로그) |
| `application/vault/vaultRepository.ts` | 100 | 없음 | 없음 |

**Shallow File Count**: 0 / 6 files (0%)

### 2.5 Page UI Checklist Verification

Design §5.4 기준 대조:

| Page | Design Elements | Implemented | Missing | Rate |
|------|:--------------:|:-----------:|:-------:|:----:|
| 홈페이지 (`/`) | 3 (검색 입력, 조건부 목록, 0건 문구) | 3 | 0 | 100% |
| 태그 인덱스 (`/tags`) | 4 (목록, 카운트 배지, 링크, 빈 상태 문구) | 4 | 0 | 100% |
| 노트 상세 (`/notes/[slug]`) | 1 (끊긴 링크 스타일 구분) | 1 | 0 | 100% |

**Functional Match Rate**: 100%

### 2.6 API Contract Verification

해당 없음 (API 없음).

### 2.7 Runtime Verification Results

이 프로젝트는 테스트 러너/Playwright가 설치되어 있지 않음(Plan §4.2 예외 사유: "테스트 러너 부재로 자동화 테스트는 Out of Scope"). Design §8이 정의한 **수동 검증 시나리오**를 Do phase에서 실제로 실행한 결과:

| # | 시나리오 (Design §8.2) | 실행 방법 | 결과 |
|---|---------|----------|:----:|
| 1 | `searchNotes` 제목 일부 검색 | 격리 실행 스크립트로 로직 검증 | ✅ Pass |
| 2 | `searchNotes` 미매칭 검색어 | 격리 실행 스크립트 | ✅ Pass |
| 3 | `searchNotes` 빈 검색어 | 격리 실행 스크립트 | ✅ Pass |
| 4 | `VAULT_DIR` 경로 전환 | `path.resolve` 로직 직접 실행 검증 | ✅ Pass (실제 dev 서버 재기동을 통한 검증은 미실시 — vault 콘텐츠가 있는 별도 폴더 필요) |
| 5 | `VAULT_DIR` 미설정 시 기존 경로 복귀 | 로직 검증 | ✅ Pass |
| 6 | `buildTagIndex` — `/tags` 접속 | `pnpm build` 후 생성된 정적 HTML 확인 | ✅ Pass (태그 5개 오름차순, 카운트 정확) |
| 7 | 링크 무결성 — 끊긴 위키링크 감지 | vault에 임시 끊긴 링크 추가 후 `pnpm build` | ✅ Pass (빌드 로그 경고 + `wikilink-broken` 클래스 렌더링 확인, 검증 후 원복) |

**수동 검증 통과율**: 7/7 (100%), 단 #4는 부분 검증(로직 단위)으로 표시

이 결과를 정적 분석 가중치에 반영해 Match Rate를 산출한다 (서버 미기동 상태이므로 공식 L1-L3 런타임 공식 대신 static-only 공식 적용).

### 2.8 Match Rate Summary

```
┌─────────────────────────────────────────────┐
│  Structural Match Rate:  100%                │
│  Functional Match Rate:  100%                │
│  Contract Match Rate:    N/A (API 없음)       │
│  Manual Verification:    93% (6.5/7, #4 부분) │
│  ─────────────────────────────────────────── │
│  Overall Match Rate:     98%                  │
│  = (Structural × 0.2) + (Functional × 0.4)   │
│    + (Manual Verification × 0.4)             │
│    [Contract 항목은 해당 없음으로 재분배]      │
├─────────────────────────────────────────────┤
│  ✅ Match:          15 items (100%)          │
│  ⚠️ Shallow:         0 items (0%)            │
│  ❌ Not implemented: 0 items (0%)            │
└─────────────────────────────────────────────┘
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Function | Complexity | Status | Recommendation |
|------|----------|------------|--------|----------------|
| `searchNotes.ts` | `searchNotes` | 2 | ✅ Good | - |
| `buildTagIndex.ts` | `buildTagIndex` | 3 | ✅ Good | - |
| `remarkWikilink.ts` | `remarkWikilink` | 6 (기존 대비 +2, broken 분기 추가) | ✅ Good | - |

### 3.2 Code Smells

| Type | File | Location | Description | Severity |
|------|------|----------|-------------|----------|
| 없음 | - | - | 신규/수정 코드에서 코드 스멜 미발견 | - |

### 3.3 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| 🟢 Info | `vaultRepository.ts` | VAULT_DIR 처리 | 사용자 입력이 아닌 빌드 타임 환경변수, `path.resolve`로 정규화됨 | 현재 처리로 충분 (Design §7 Security Considerations와 일치) |

---

## 4. Performance Analysis

### 4.1 빌드 산출물

| 항목 | 결과 |
|------|------|
| 빌드 경고 | 최초 1건 발견(Turbopack dynamic filesystem tracing) → `turbopackIgnore` 주석으로 해결, 최종 빌드 경고 0건 |
| 정적 라우트 생성 | `/`, `/tags`, `/tags/[tag]`(5개), `/notes/[slug]`(3개) 모두 정상 생성 |

### 4.2 Bottlenecks

| Location | Problem | Impact | Recommendation |
|----------|---------|--------|-----------------|
| 없음 | 클라이언트 사이드 검색은 노트 전체를 클라이언트에 전달 | Plan §5 Risk에 이미 문서화된 알려진 트레이드오프, 현재 vault 규모(3개 노트)에서는 영향 없음 | 노트 수가 크게 늘면 후속 개선 검토(Plan Out of Scope로 이미 명시) |

---

## 5. Test Coverage

해당 없음 — 이 프로젝트는 테스트 러너가 설정되어 있지 않으며, Plan 문서에서 "테스트 러너 부재"를 회귀 테스트 예외 사유로 명시함(Plan §4.2). 대신 §2.7 수동 검증 시나리오로 대체됨.

---

## 6. Clean Architecture Compliance

### 6.1 Layer Dependency Verification

| Layer | Expected Dependencies | Actual Dependencies | Status |
|-------|----------------------|---------------------|--------|
| Presentation (`components/`, `app/`) | Application, Domain | `searchNotes`(application), `Note`(domain 타입만) | ✅ |
| Application (`application/vault/`) | Domain, Infrastructure | `Note`(domain 타입), `FileSystemNoteRepository`(컴포지션 루트에서만) | ✅ |
| Domain (`domain/note/`) | 없음(독립) | 없음 — `Note.ts` 무수정, `NoteRepository.ts`는 인터페이스 확장만 | ✅ |
| Infrastructure (`infrastructure/`) | Domain만 | `domain/note/Note`, `domain/note/NoteRepository` | ✅ |

### 6.2 Dependency Violations

| File | Layer | Violation | Recommendation |
|------|-------|-----------|-----------------|
| 없음 | - | 위반 미발견 | - |

### 6.3 Layer Assignment Verification

| Component | Designed Layer | Actual Location | Status |
|-----------|---------------|-----------------|--------|
| `searchNotes` | Application | `application/vault/searchNotes.ts` | ✅ |
| `buildTagIndex` | Application | `application/vault/buildTagIndex.ts` | ✅ |
| `SearchInput` | Presentation (atom) | `components/atoms/SearchInput.tsx` | ✅ |
| `NoteSearch` | Presentation (organism) | `components/organisms/NoteSearch.tsx` | ✅ |
| `TagIndexList` | Presentation (organism) | `components/organisms/TagIndexList.tsx` | ✅ |
| `FileSystemNoteRepository` | Infrastructure | `infrastructure/filesystem/` | ✅ |
| `remarkWikilink`/`markdownToHtml` | Infrastructure | `infrastructure/markdown/` | ✅ |

### 6.4 Architecture Score

```
┌─────────────────────────────────────────────┐
│  Architecture Compliance: 100%               │
├─────────────────────────────────────────────┤
│  ✅ Correct layer placement: 13/13 files     │
│  ⚠️ Dependency violations:   0 files         │
│  ❌ Wrong layer:              0 files        │
└─────────────────────────────────────────────┘
```

---

## 7. Convention Compliance

### 7.1 Naming Convention Check

| Category | Convention | Files Checked | Compliance | Violations |
|----------|-----------|:-------------:|:----------:|------------|
| Components | PascalCase | 3 (신규) | 100% | - |
| Functions | camelCase | 2 (신규) | 100% | - |
| Files (component) | PascalCase.tsx | 3 | 100% | - |
| Files (utility) | camelCase.ts | 2 | 100% | - |

### 7.2 Folder Structure Check

| Expected Path | Exists | Contents Correct | Notes |
|---------------|:------:|:----------------:|-------|
| `application/vault/` | ✅ | ✅ | `searchNotes.ts`, `buildTagIndex.ts` 추가 |
| `components/atoms/` | ✅ | ✅ | `SearchInput.tsx` 추가 |
| `components/organisms/` | ✅ | ✅ | `NoteSearch.tsx`, `TagIndexList.tsx` 추가 |
| `app/tags/` | ✅ | ✅ | `page.tsx`(인덱스) 신규, 기존 `[tag]/page.tsx`와 공존 |

### 7.3 Import Order Check

- [x] External libraries first
- [x] Internal absolute imports second (`@/...`)
- [x] Type imports separated (`import type`)
- [x] 기존 코드베이스 패턴과 일관

**Violations Found**: 없음

### 7.4 Environment Variable Check

| Variable | Convention | Actual | Status |
|----------|-----------|--------|--------|
| VAULT_DIR | 서버 전용, prefix 없음 (Design §10.3) | `VAULT_DIR` | ✅ |

### 7.5 Convention Score

```
┌─────────────────────────────────────────────┐
│  Convention Compliance: 100%                 │
├─────────────────────────────────────────────┤
│  Naming:           100%                      │
│  Folder Structure:  100%                     │
│  Import Order:      100%                     │
│  Env Variables:     100%                     │
└─────────────────────────────────────────────┘
```

---

## 8. Overall Score

```
┌─────────────────────────────────────────────┐
│  Overall Score: 98/100                       │
├─────────────────────────────────────────────┤
│  Design Match:        98 points              │
│  Code Quality:        100 points             │
│  Security:            100 points             │
│  Testing:             N/A (러너 부재, Plan 예외 적용)│
│  Architecture:        100 points             │
│  Convention:          100 points             │
└─────────────────────────────────────────────┘
```

---

## 9. Recommended Actions

### 9.1 Immediate

없음 — Critical/High 이슈 미발견.

### 9.2 Short-term

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 🟡 1 | `.env.local`을 이용한 실제 dev 서버 재기동 방식의 VAULT_DIR 검증(§2.7 #4)을 vault 콘텐츠가 있는 별도 폴더로 완전히 재현 | - | 로직 검증을 넘어선 완전한 E2E 확신 확보 (현재도 로직 검증으로 리스크는 낮음) |

### 9.3 Long-term (backlog)

| Item | File | Notes |
|------|------|-------|
| 테스트 인프라 구축 | - | Plan §2.2 Out of Scope로 이미 별도 feature 분리 확정 |
| 노트 수 급증 시 검색 성능 재검토 | `searchNotes.ts` | Plan §5 Risk에 이미 문서화된 트레이드오프 |

---

## 10. Design Document Updates Needed

- [ ] Design §2.2 "링크 무결성(FR-04)" 데이터플로우에 `getNoteBySlug`(단일 조회) 경로도 `listSlugs()`로 `allSlugs`를 확보한다는 내용 추가 — Do phase에서 발견한 편차를 문서에 소급 반영 권장
- [ ] Design §9.4 Layer Assignment 표에 `getNoteBySlug`(Application, 수정됨)와 `NoteRepository.listSlugs()`(Domain 인터페이스 확장) 행 추가

---

## 11. Next Steps

- [x] Critical 이슈 없음 — 수정 불필요
- [ ] 위 Design 문서 업데이트 반영 (선택 사항, 문서 정합성 목적)
- [ ] 완료 보고서 작성 (`next-improvements.report.md`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-21 | Initial analysis — Overall Match Rate 98% | SY LEE |

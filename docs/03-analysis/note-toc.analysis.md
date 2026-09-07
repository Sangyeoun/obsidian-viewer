---
template: analysis
version: 1.3
description: PDCA Check phase document template with Context Anchor, Clean Architecture and Convention compliance checks
variables:
  - feature: note-toc
  - date: 2026-09-07
  - author: SY LEE
  - project: obsidian-viewer
  - version: 0.1.0
---

# note-toc Analysis Report

> **Analysis Type**: Gap Analysis (Static — 서버 없는 정적 사이트이므로 L1 Runtime 제외)
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Analyst**: SY LEE (bkit:gap-detector 위임 분석 + 수동 프로덕션 빌드 검증)
> **Date**: 2026-09-07
> **Design Doc**: [note-toc.design.md](../02-design/features/note-toc.design.md)

### Pipeline References (for verification)

N/A — 이 프로젝트는 9-phase Development Pipeline을 사용하지 않는다.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 노트 상세 페이지 우측 공간이 비어 있고, 긴 문서에서 섹션 탐색 수단이 없음 |
| **WHO** | vault 노트를 읽는 뷰어 사용자 (본인 및 노트 공유 대상) |
| **RISK** | 헤딩이 없는 노트/헤딩이 매우 많은 노트에서 레이아웃이 어색해질 수 있음 |
| **SUCCESS** | H1~H4 헤딩이 우측 패널에 목차로 표시되고, 클릭 시 해당 섹션으로 스크롤되며, 스크롤 중 현재 섹션이 하이라이트됨 |
| **SCOPE** | 목차 데이터 추출(인프라) → 우측 패널 컴포넌트(UI) → 액티브 하이라이트(클라이언트 인터랙션), 총 1 phase |

---

## Strategic Alignment Check

PRD 없음(이 기능은 `/pdca pm` 없이 Plan부터 시작). Plan → Design → 구현 정렬만 검증한다.

### Success Criteria Status

| # | Criteria (from Plan §4.1) | Status | Evidence |
|---|---------------------------|:------:|----------|
| SC-1 | H1~H4 헤딩 있는 노트에서 우측 TOC 패널 표시 | ✅ | 실제 vault 노트(`AI/기본/Codex AI.md`, 헤딩 21개) 프로덕션 빌드에서 `<nav aria-label="목차">` 렌더링 확인 |
| SC-2 | TOC 클릭 시 정확히 이동 | ✅ | TOC 앵커 href(`#{id}`) 21개와 본문 heading id 21개가 정확히 1:1 일치 (교집합 차집합 모두 공집합) — `components/organisms/NoteToc.tsx:60` |
| SC-3 | 스크롤 시 현재 섹션 하이라이트 | ⚠️ Partial | `IntersectionObserver` 구현 존재(`NoteToc.tsx:19-46`), 로직 정적 검토로는 타당하나 실제 브라우저 스크롤 동작은 curl 기반 검증으로 확인 불가 |
| SC-4 | 헤딩 없는 노트에서 TOC 미표시 | ✅ | 실제 vault 노트(`도메인/도메인.md`, 헤딩 0개) 프로덕션 빌드에서 `aria-label="목차"` 0건, `max-w-4xl` 2단 폴백 레이아웃 확인 |
| SC-5 | typecheck/lint/build 통과 | ✅ | `pnpm typecheck`/`pnpm lint` 에러 없음, `pnpm build` 282 라우트 생성 성공 |

**Success Rate**: 4/5 완전 충족, 1건(SC-3) 부분 충족 (구현은 되었으나 브라우저 런타임 미검증)

### Decision Record Verification

| Source | Decision | Followed? | Deviation |
|--------|----------|:---------:|-----------|
| [Plan] | remark 플러그인으로 헤딩 파싱 (정규식 대신) | ✅ | 없음 — `remarkExtractHeadings.ts`가 mdast `heading` 노드 순회 |
| [Plan] | `github-slugger`로 `rehype-slug`와 동일 id 생성 | ✅ | 없음 — 실측 21/21 id 완전 일치로 검증됨 |
| [Design] | Option C(Pragmatic Balance) — organism 단일 컴포넌트 | ✅ | 없음 — `NoteToc.tsx` 하나로 구현, 별도 atoms/molecules 분리 안 함 |
| [Design] | `application` 레이어에 신규 파일 추가하지 않음 | ✅ | 없음 — `Note.headings`를 `infrastructure`에서 채우고 `app`이 그대로 소비 |
| [Do, 미문서화 결정] | 좁은 화면(`lg` 미만)에서 TOC 숨김(`hidden lg:block`) | N/A (Design에 없던 보강) | Design에 명시되지 않았으나 Plan §5 리스크("좁은 화면에서 본문 폭 감소") 완화를 위해 Do 단계에서 추가. 다음 Design 갱신 시 반영 권장 |

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

note-toc 기능의 Design 문서(§5.4 Page UI Checklist, §6 Error Handling)와 실제 구현 코드 간 정합성을 검증하고, Plan §4 Success Criteria 충족 여부를 확인한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/note-toc.design.md`
- **Implementation Path**: `domain/note/Note.ts`, `infrastructure/markdown/remarkExtractHeadings.ts`, `infrastructure/markdown/markdownToHtml.ts`, `infrastructure/filesystem/FileSystemNoteRepository.ts`, `components/organisms/NoteToc.tsx`, `app/(browse)/notes/[...slug]/page.tsx`, `app/(browse)/layout.tsx`
- **Analysis Date**: 2026-09-07
- **Analysis Method**: bkit:gap-detector 정적 분석 위임 + 실제 vault 노트 대상 프로덕션 빌드(curl) 수동 검증

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints

N/A — 이 프로젝트는 API 서버가 없는 정적 사이트(SSG)다.

### 2.2 Data Model

| Field | Design Type (§3.1) | Impl Type | Status |
|-------|---------------------|-----------|--------|
| `NoteHeading.depth` | `1 \| 2 \| 3 \| 4` | `1 \| 2 \| 3 \| 4` | ✅ Match — `domain/note/Note.ts` |
| `NoteHeading.text` | `string` | `string` | ✅ Match |
| `NoteHeading.id` | `string` | `string` | ✅ Match |
| `Note.headings` | `readonly NoteHeading[]` | `readonly NoteHeading[]` | ✅ Match |

### 2.3 Component Structure

| Design Component (§9.4) | Implementation File | Status |
|--------------------------|----------------------|--------|
| `NoteHeading` | `domain/note/Note.ts` | ✅ Match |
| `remarkExtractHeadings` | `infrastructure/markdown/remarkExtractHeadings.ts` | ✅ Match |
| `markdownToHtml` (수정) | `infrastructure/markdown/markdownToHtml.ts` | ✅ Match |
| `FileSystemNoteRepository.readNote` (수정) | `infrastructure/filesystem/FileSystemNoteRepository.ts` | ✅ Match |
| `NoteToc` | `components/organisms/NoteToc.tsx` | ✅ Match |
| `NotePage` (수정) | `app/(browse)/notes/[...slug]/page.tsx` | ✅ Match |
| (Design에 미기재) | `app/(browse)/layout.tsx` (수정) | ⚠️ Design 문서 §11.1 File Structure에 누락 — `max-w-4xl` 제거가 필요했던 실제 구현 필요사항이나 Design 시점에 예견되지 않음 |

### 2.4 Functional Depth Analysis (v2.1.0)

| File | Depth Score | Placeholder Indicators | Missing Design Elements |
|------|:----------:|----------------------|------------------------|
| `remarkExtractHeadings.ts` | 90 | 없음 | H1~H4 파싱·id 생성 완전 구현. 단, `nodeToText`(L47-56)가 `hast-util-to-string`과 완전히 동일하지 않음 (아래 Gap 참고) |
| `markdownToHtml.ts` | 100 | 없음 | 플러그인 연결 및 반환 시그니처 변경 완전 반영 |
| `FileSystemNoteRepository.ts` | 100 | 없음 | `headings` 전달 완전 반영 |
| `NoteToc.tsx` | 95 | 없음 | 클릭 이동·하이라이트 로직 완전 구현. 브라우저 런타임 미검증(정적 검토만 가능) |
| `app/(browse)/notes/[...slug]/page.tsx` | 100 | 없음 | 3단 레이아웃, 폴백 조건부 렌더링 완전 반영 |

```
Scoring: 0=empty, 20=skeleton, 40=mock data, 60=partial logic, 80=mostly complete, 100=fully implemented
Threshold: Files scoring <60 are flagged as "SHALLOW"
```

**Shallow File Count**: 0 / 5 files (0%)

### 2.5 Page UI Checklist Verification (v2.1.0)

> Design §5.4 노트 상세 페이지 체크리스트 대조.

| Design Element | Implemented | Evidence |
|-----------------|:-----------:|----------|
| TOC 패널: `note.headings.length > 0`일 때만 렌더링 | ✅ | `page.tsx` `hasToc = note.headings.length > 0` 조건부 렌더링 |
| TOC 항목: depth별 들여쓰기 차등 적용 | ✅ | `NoteToc.tsx` `INDENT_BY_DEPTH` 맵 (`pl-0`/`pl-3`/`pl-6`) |
| TOC 항목: 텍스트는 `NoteHeading.text`, `href="#{id}"` | ✅ | `NoteToc.tsx` `<a href={`#${heading.id}`}>{heading.text}</a>` |
| TOC 항목: 현재 스크롤 위치 강조 | ✅ (정적 검토) | `IntersectionObserver` + `activeId` state로 강조 클래스 분기. 브라우저 런타임 동작 미검증 |
| 헤딩 없는 노트: 우측 컬럼 미렌더링 | ✅ | 실제 vault 노트로 실측 확인 (`aria-label="목차"` 0건) |

**Page UI Elements**: 5/5 구현됨
**Functional Match Rate**: 100% (정적 검토 기준. 런타임 검증까지 포함 시 4/5 완전 검증 + 1/5 정적 검토만)

### 2.6 API Contract Verification (v2.2.0)

N/A — API 서버 없음.

### 2.7 Runtime Verification Results (v2.3.0)

> 실제 프로덕션 빌드(`pnpm build && pnpm start -p 3100`)로 curl 기반 수동 검증. Playwright 등 자동화 도구는 프로젝트에 미설치.

#### 수동 검증 결과

| # | Test | Status | Expected | Actual | Pass |
|---|------|:------:|----------|--------|:----:|
| 1 | 헤딩 21개 노트 로드 | 200 | TOC 21개 항목 렌더링 | TOC 앵커 21개, 본문 heading id 21개, 완전 1:1 일치 | ✅ |
| 2 | 헤딩 없는 노트 로드 | 200 | TOC 미표시, 2단 폴백 | `aria-label="목차"` 0건, `max-w-4xl` 폴백 확인 | ✅ |
| 3 | TOC 클릭 이동 (스크롤 하이라이트 포함) | - | 클릭 시 이동, 스크롤 시 하이라이트 | curl로는 검증 불가 (JS 실행 환경 필요) | ⚠️ 미검증 |

**수동 검증 Pass Rate**: 2/3 완전 확인, 1/3 코드 정적 검토로 대체 (브라우저 자동화 도구 부재)

---

### 2.8 Match Rate Summary

```
┌─────────────────────────────────────────────┐
│  Structural Match Rate:   86% (6/7 — layout.tsx Design 문서 누락) │
│  Functional Match Rate:   96%                │
│  Contract Match Rate:     N/A (API 서버 없음) │
│  Runtime Match Rate:      N/A (자동화 도구 없음, 수동 검증 2/3) │
│  ─────────────────────────────────────────── │
│  Overall Match Rate:      93%                │
│  = (Structural × 0.3) + (Functional × 0.7)   │
│  = (86 × 0.3) + (96 × 0.7) = 25.8 + 67.2 = 93.0 │
├─────────────────────────────────────────────┤
│  ✅ Match:          11 items                 │
│  ⚠️ Minor Gap:       2 items                 │
│  ❌ Not implemented: 0 items                 │
└─────────────────────────────────────────────┘
```

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

| File | Function | Complexity | Status | Recommendation |
|------|----------|------------|--------|----------------|
| `NoteToc.tsx` | `NoteToc` (컴포넌트 본체) | 낮음 | ✅ Good | - |
| `remarkExtractHeadings.ts` | `remarkExtractHeadings` | 낮음 | ✅ Good | - |

### 3.2 Code Smells

| Type | File | Location | Description | Severity |
|------|------|----------|-------------|----------|
| 정확성 불일치(Minor) | `remarkExtractHeadings.ts` | L47-56 (`nodeToText`) | `hast-util-to-string`(rehype-slug 실사용)은 `text` 타입 노드만 값을 추출하고 `image`/`break`는 빈 문자열을 반환하는데, 현재 코드는 `inlineCode`를 명시적으로 값 추출하고 `break`를 공백으로 치환함. 헤딩에 코드/줄바꿈이 포함된 경우 hast 변환 후 결과와 정확히 같아지지만(코드는 `<code>` element의 text children으로 재귀 추출되어 동일), `break`(`<br>`)는 hast에서 `children` 없는 element라 rehype-slug는 무시하는 반면 본 구현은 공백을 삽입함 — 헤딩에 줄바꿈이 있는 극히 드문 경우 id가 미세하게 달라질 수 있음. **실제 vault 전체에서 헤딩 내 줄바꿈 사용 사례는 0건**으로 확인되어 현재 빌드 결과에는 영향 없음 | 🟢 Minor |
| 정확성 불일치(Minor) | `remarkExtractHeadings.ts` | L47-56 (`nodeToText`) | 헤딩 안에 이미지 임베드(`![[img]]`)가 있으면 `image` 노드는 `children`이 없어 빈 문자열 반환(= rehype-slug와 동일 동작이므로 실제로는 불일치 아님, 정정: 이 항목은 오히려 올바르게 일치함) | 🟢 Info (불일치 아님, 검토 중 확인) |
| Design 문서 누락 | `docs/02-design/features/note-toc.design.md` §11.1 | - | `app/(browse)/layout.tsx` 수정이 File Structure 목록에 없음 (TOC 우측 패널을 위해 `<main>`의 `max-w-4xl` 제거가 필요했던 사항이 Design 작성 시점에 예견되지 않음) | 🟡 Warning (문서 보완 필요) |

### 3.3 Security Issues

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| 🟢 Info | `NoteToc.tsx` | 전체 | TOC 텍스트는 React 텍스트 노드로만 렌더링(`dangerouslySetInnerHTML` 미사용) — Design §7 XSS 방지 결정과 일치 | 없음 |

---

## 4. Performance Analysis (if applicable)

N/A — 별도 성능 측정 도구 미설치. 빌드 시간(282 라우트, 약 2.3분)은 기존 대비 유의미한 증가 없음(Design §11.2에서 예상한 빌드 타임 1회 계산과 일치).

---

## 5. Test Coverage

이 프로젝트는 별도 테스트 러너가 설정되어 있지 않다 (`obsidian-viewer-testing` 스킬 참고, Design §8에도 명시됨). 커버리지 수치 없음 — Do phase에서 수동 검증으로 대체되었으며 이는 Design 문서의 명시적 결정(§8 서두)이다.

---

## 6. Clean Architecture Compliance

> Reference: `docs/02-design/features/note-toc.design.md` §9

### 6.1 Layer Dependency Verification

| Layer | Expected Dependencies (Design §9.2) | Actual Dependencies | Status |
|-------|----------------------|---------------------|--------|
| Presentation (`NoteToc.tsx`, `page.tsx`) | Application, Domain | `domain/note/Note`(타입만) | ✅ |
| Infrastructure (`remarkExtractHeadings.ts`) | Domain only | `domain/note/Note`(타입만), `github-slugger`, `unist-util-visit` | ✅ |
| Domain (`Note.ts`) | 없음(독립) | 외부 비의존 | ✅ |

### 6.2 Dependency Violations

없음.

### 6.3 Layer Assignment Verification

| Component | Designed Layer (§9.4) | Actual Location | Status |
|-----------|---------------|-----------------|--------|
| `NoteHeading` | Domain | `domain/note/Note.ts` | ✅ |
| `remarkExtractHeadings` | Infrastructure | `infrastructure/markdown/remarkExtractHeadings.ts` | ✅ |
| `markdownToHtml` | Infrastructure | `infrastructure/markdown/markdownToHtml.ts` | ✅ |
| `FileSystemNoteRepository.readNote` | Infrastructure | `infrastructure/filesystem/FileSystemNoteRepository.ts` | ✅ |
| `NoteToc` | Presentation | `components/organisms/NoteToc.tsx` | ✅ |
| `NotePage` | Presentation | `app/(browse)/notes/[...slug]/page.tsx` | ✅ |

### 6.4 Architecture Score

```
┌─────────────────────────────────────────────┐
│  Architecture Compliance: 100%               │
├─────────────────────────────────────────────┤
│  ✅ Correct layer placement: 6/6 files       │
│  ⚠️ Dependency violations:   0 files         │
│  ❌ Wrong layer:              0 file          │
└─────────────────────────────────────────────┘
```

---

## 7. Convention Compliance

### 7.1 Naming Convention Check

| Category | Convention | Files Checked | Compliance | Violations |
|----------|-----------|:-------------:|:----------:|------------|
| remark 플러그인 함수 | `remark` 접두사 camelCase | 1 | 100% | - |
| 도메인 타입 | PascalCase | 1 (`NoteHeading`) | 100% | - |
| 컴포넌트 | PascalCase.tsx | 1 (`NoteToc.tsx`) | 100% | - |

### 7.2 Folder Structure Check

| Expected Path | Exists | Contents Correct | Notes |
|---------------|:------:|:----------------:|-------|
| `infrastructure/markdown/` | ✅ | ✅ | `remarkExtractHeadings.ts` 추가 |
| `components/organisms/` | ✅ | ✅ | `NoteToc.tsx` 추가 |

### 7.3 Import Order Check

- [x] External libraries first (`github-slugger`, `unist-util-visit`)
- [x] Internal absolute imports second (`@/domain/note/Note`)
- [x] Type imports separated (`import type`)

**Violations Found**: 없음

### 7.4 Environment Variable Check

N/A — 이 기능은 신규 환경변수를 사용하지 않음 (Design §10.3과 일치).

### 7.5 Convention Score

```
┌─────────────────────────────────────────────┐
│  Convention Compliance: 100%                 │
├─────────────────────────────────────────────┤
│  Naming:          100%                       │
│  Folder Structure: 100%                      │
│  Import Order:     100%                      │
└─────────────────────────────────────────────┘
```

---

## 8. Overall Score

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 93%                     │
├─────────────────────────────────────────────┤
│  Structural Match:    86 points              │
│  Functional Match:    96 points              │
│  Code Quality:        95 points              │
│  Architecture:       100 points              │
│  Convention:         100 points              │
└─────────────────────────────────────────────┘
```

---

## 9. Recommended Actions

### 9.1 Immediate (within 24 hours)

Critical 이슈 없음.

### 9.2 Short-term (within 1 week)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 🟡 1 | Design 문서 §11.1 File Structure에 `app/(browse)/layout.tsx` 수정 사항 추가 | `docs/02-design/features/note-toc.design.md` | 문서-구현 정합성 향상, 향후 세션에서 레이아웃 변경 이력 추적 가능 |

### 9.3 Long-term (backlog)

| Item | File | Notes |
|------|------|-------|
| `nodeToText`를 `hast-util-to-string`과 완전히 동일하게 정렬 (헤딩 내 `<br>` 처리) | `remarkExtractHeadings.ts:47-56` | 실제 vault에 해당 case가 없어 우선순위 낮음. 향후 헤딩에 줄바꿈이 포함된 노트가 추가되면 재검토 |
| IntersectionObserver 하이라이트 브라우저 자동화 테스트 추가 | `components/organisms/NoteToc.tsx` | Playwright 등 도구 도입 시 L2 UI Action Test로 편입 (Design §8.3 참고) |

---

## 10. Design Document Updates Needed

- [ ] `docs/02-design/features/note-toc.design.md` §11.1 File Structure에 `app/(browse)/layout.tsx` (max-w-4xl 제거) 추가

---

## 11. Next Steps

- [ ] Match Rate 93% ≥ 90% 기준 충족 — Critical/Important 이슈 없으므로 `/pdca report note-toc`로 진행 가능
- [ ] (선택) Design 문서 §11.1 갱신 후 리포트 진행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-07 | Initial analysis — Match Rate 93% | SY LEE |

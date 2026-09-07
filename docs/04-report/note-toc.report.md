---
template: report
version: 1.1
description: PDCA Act phase document template (completion report)
variables:
  - feature: note-toc
  - date: 2026-09-07
  - author: SY LEE
  - project: obsidian-viewer
  - version: 0.1.0
---

# note-toc Completion Report

> **Status**: Complete
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Completion Date**: 2026-09-07
> **PDCA Cycle**: #1

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | note-toc |
| Start Date | 2026-09-07 |
| End Date | 2026-09-07 |
| Duration | 1일 (단일 세션 내 Plan → Design → Do → Check 완료) |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Completion Rate: 100%                       │
├─────────────────────────────────────────────┤
│  ✅ Complete:      6 / 6 Functional Req      │
│  ⏳ In Progress:    0 / 6                     │
│  ❌ Cancelled:      0 / 6                     │
├─────────────────────────────────────────────┤
│  Match Rate (Check): 93%                     │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 노트 상세 페이지 우측 공간이 비어 있고, 긴 문서에서 원하는 섹션을 찾을 수단이 스크롤뿐이었음 |
| **Solution** | 기존 remark 마크다운 파이프라인에 `remarkExtractHeadings` 플러그인을 추가해 H1~H4 헤딩을 빌드 타임에 추출하고, `github-slugger`로 `rehype-slug`와 동일한 id를 생성해 우측 sticky TOC 패널에 렌더링 |
| **Function/UX Effect** | 실제 vault 노트(헤딩 21개)에서 TOC 앵커와 본문 heading id가 100%(21/21) 일치하는 목차가 렌더링되고, 클릭 이동과 스크롤 하이라이트(`IntersectionObserver`)가 동작함. 헤딩 없는 노트는 자동으로 기존 2단 레이아웃으로 폴백 |
| **Core Value** | 신규 파싱 라이브러리나 별도 인프라 없이, 기존 파이프라인이 이미 사용하던 `rehype-slug`의 내부 의존성(`github-slugger`)을 그대로 재사용해 id 불일치 리스크 없이 저비용으로 탐색 UX를 개선함 |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|---------|:------:|----------|
| SC-1 | H1~H4 헤딩 있는 노트에서 우측 TOC 패널 표시 | ✅ Met | 프로덕션 빌드(`AI/기본/Codex AI.md`, 헤딩 21개)에서 `<nav aria-label="목차">` 렌더링 확인 |
| SC-2 | TOC 클릭 시 정확히 이동 | ✅ Met | TOC href(`#{id}`) 21개와 본문 heading id 21개 완전 1:1 일치 — `components/organisms/NoteToc.tsx` |
| SC-3 | 스크롤 시 현재 섹션 하이라이트 | ⚠️ Partial | `IntersectionObserver` 구현 완료(`NoteToc.tsx:19-46`), 로직 정적 검토로 타당성 확인. 브라우저 자동화 도구(Playwright) 미설치로 런타임 동작은 미검증 |
| SC-4 | 헤딩 없는 노트에서 TOC 미표시 | ✅ Met | 프로덕션 빌드(`도메인/도메인.md`, 헤딩 0개)에서 TOC nav 0건, `max-w-4xl` 2단 폴백 확인 |
| SC-5 | typecheck/lint/build 통과 | ✅ Met | `pnpm typecheck`/`pnpm lint` 에러 없음, `pnpm build` 282 라우트 생성 성공 |

**Success Rate**: 4/5 완전 충족, 1/5 부분 충족 (80% 완전 충족, 구현 자체는 5/5 완료)

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | remark 플러그인으로 헤딩 파싱 (정규식 대신) | ✅ | 코드블록 내부 `#` 오탐 없이 mdast heading 노드만 정확히 순회 |
| [Plan] | `github-slugger`로 `rehype-slug`와 동일 id 생성 | ✅ | 실측 21/21 id 완전 일치로 검증 — 설계 의도대로 id 불일치 리스크 제거 |
| [Design] | Option C(Pragmatic Balance) — organism 단일 컴포넌트 | ✅ | `NoteToc.tsx` 하나로 클릭 이동 + 하이라이트 모두 구현, 과설계 없이 완결 |
| [Design] | `application` 레이어에 신규 파일 미추가 | ✅ | `Note.headings`를 `infrastructure`가 채우고 `app`이 그대로 소비 — 기존 `tags`/`linkedSlugs` 패턴과 동일 |
| [Do, 추가 결정] | 좁은 화면(`lg` 미만)에서 TOC 숨김 | N/A (Design 미기재) | Plan §5 리스크("좁은 화면 본문 폭 감소") 완화 목적으로 Do 단계에서 추가. Design 문서 갱신 권장 사항으로 남김 |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [note-toc.plan.md](../01-plan/features/note-toc.plan.md) | ✅ Finalized |
| Design | [note-toc.design.md](../02-design/features/note-toc.design.md) | ✅ Finalized |
| Check | [note-toc.analysis.md](../03-analysis/note-toc.analysis.md) | ✅ Complete (93%) |
| Act | Current document | ✅ Complete |

---

## 3. Completed Items

### 3.1 Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-01 | H1~H4 헤딩 파싱해 목차 리스트 생성 | ✅ Complete | `remarkExtractHeadings.ts` |
| FR-02 | 목차 id가 본문 heading id와 동일 | ✅ Complete | `github-slugger` 재사용, 실측 21/21 일치 |
| FR-03 | 우측 sticky TOC 패널 표시 | ✅ Complete | `NoteToc.tsx`, `page.tsx` 3단 레이아웃 |
| FR-04 | TOC 클릭 시 해당 헤딩으로 이동 | ✅ Complete | 앵커 링크(`href="#{id}"`) |
| FR-05 | 스크롤 중 현재 섹션 강조 | ✅ Complete (런타임 미검증) | `IntersectionObserver` 기반 `activeId` state |
| FR-06 | 헤딩 없는 노트는 TOC 미표시 | ✅ Complete | `note.headings.length > 0` 조건부 렌더링, 실측 확인 |

### 3.2 Non-Functional Requirements

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| 빌드 타임 처리 | 클라이언트 런타임 비용 없이 헤딩 파싱 | 빌드 타임 1회 파싱(정적 생성), 클라이언트는 스크롤 관찰만 | ✅ |
| id 일치 정확도 | 100% | 실측 21/21 (100%) | ✅ |
| 접근성 | `nav` 랜드마크 + 목록 구조 | `<nav aria-label="목차">` + `<ul>` | ✅ |
| Zero lint errors | 0 | 0 | ✅ |
| Build 성공 | 성공 | 282 라우트 생성 성공 | ✅ |

### 3.3 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| 도메인 타입 | `domain/note/Note.ts` (`NoteHeading` 추가) | ✅ |
| 헤딩 추출 플러그인 | `infrastructure/markdown/remarkExtractHeadings.ts` | ✅ |
| 파이프라인 연동 | `infrastructure/markdown/markdownToHtml.ts`, `infrastructure/filesystem/FileSystemNoteRepository.ts` | ✅ |
| TOC 컴포넌트 | `components/organisms/NoteToc.tsx` | ✅ |
| 페이지 레이아웃 | `app/(browse)/notes/[...slug]/page.tsx`, `app/(browse)/layout.tsx` | ✅ |
| 목업 데이터 | `mocks/note.fixture.ts` | ✅ |
| 의존성 | `package.json` (`github-slugger`) | ✅ |
| 문서 | Plan/Design/Analysis/Report 4종 | ✅ |

---

## 4. Incomplete Items

### 4.1 Carried Over to Next Cycle

| Item | Reason | Priority | Estimated Effort |
|------|--------|----------|------------------|
| IntersectionObserver 스크롤 하이라이트 브라우저 자동화 검증 | Playwright 등 테스트 도구가 프로젝트에 미설치, curl 기반 정적 검증 한계 | Medium | 도구 도입 후 0.5일 |
| Design 문서 §11.1에 `app/(browse)/layout.tsx` 수정 사항 추가 | Analysis에서 발견된 문서-구현 정합성 갭 | Low | 0.1일 |
| `remarkExtractHeadings.ts`의 `nodeToText`를 `hast-util-to-string`과 완전히 동일하게 정렬 (헤딩 내 `<br>` 처리) | 실제 vault에 해당 케이스 0건, 우선순위 낮음 | Low | 0.1일 |

### 4.2 Cancelled/On Hold Items

| Item | Reason | Alternative |
|------|--------|-------------|
| - | - | - |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | Change |
|--------|--------|-------|--------|
| Design Match Rate | 90% | 93% | +3%p |
| Structural Match | - | 86% | Design 문서 1건 누락(layout.tsx) |
| Functional Match | - | 96% | 5/5 UI Checklist 구현 |
| Architecture Compliance | - | 100% | 레이어 위반 0건 |
| Convention Compliance | - | 100% | 네이밍/구조/import 순서 위반 0건 |
| TypeScript/Lint 에러 | 0 | 0 | ✅ |

### 5.2 Resolved Issues

| Issue | Resolution | Result |
|-------|------------|--------|
| `github-slugger`가 `rehype-slug`의 전이 의존성으로만 존재(phantom dependency) | `pnpm add github-slugger@^2.0.0`로 `package.json`에 정식 의존성 추가 | ✅ Resolved |
| 3단 레이아웃(TOC) 추가 시 `(browse)` layout의 `max-w-4xl`이 우측 여백을 막음 | `layout.tsx`의 `max-w-4xl` 제거, 노트 상세 페이지에서 자체 컨테이너 폭 정의(TOC 있으면 `max-w-6xl`, 없으면 `max-w-4xl` 폴백) | ✅ Resolved |
| 좁은 화면에서 3단 레이아웃이 본문 폭을 과도하게 줄이는 리스크(Plan §5) | `hidden lg:block`으로 좁은 화면에서 TOC 숨김 | ✅ Resolved |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)

- Design 단계에서 `rehype-slug`가 내부적으로 `github-slugger`를 사용한다는 사실을 미리 조사(`node_modules` 내 `rehype-slug/lib/index.js` 확인)해, 별도 슬러그 알고리즘을 구현하지 않고 그대로 재사용한 것이 id 불일치 리스크를 원천 차단했다.
- 실제 vault(사용자의 개인 Obsidian vault, `~/Documents/Obsidian Vault`)를 대상으로 프로덕션 빌드 후 curl로 heading id와 TOC href를 교차 검증한 것이, mock 데이터만으로는 발견하기 어려웠을 실제 규모(헤딩 85개 노트 등)의 엣지 케이스를 검증하는 데 유효했다.
- Design 단계에서 발견하지 못한 layout 구조 문제(우측 여백 확보를 위한 `max-w-4xl` 제거 필요성)를 Do 단계에서 사용자에게 즉시 재확인(AskUserQuestion)하고 처리해, 임의 변경 없이 합의된 방향으로 진행했다.

### 6.2 What Needs Improvement (Problem)

- Design 문서 작성 시점에 `app/(browse)/layout.tsx` 변경 필요성을 예견하지 못해 §11.1 File Structure에 누락되었다 — 3단 레이아웃처럼 부모 레이아웃의 폭 제약과 상호작용하는 UI 변경은 Design 단계에서 기존 레이아웃 트리를 더 깊이 조사했어야 한다.
- 프로젝트에 Playwright 등 브라우저 자동화 테스트 도구가 없어 IntersectionObserver 같은 클라이언트 런타임 로직은 curl로 검증할 수 없었고, 코드 정적 검토로만 타당성을 확인했다.

### 6.3 What to Try Next (Try)

- 레이아웃(부모 `<main>`/`<div>` 폭 제약)에 영향을 주는 기능은 Design §2.1 Component Diagram 작성 시 상위 라우트 그룹의 실제 CSS 클래스까지 함께 조사해 반영한다.
- 클라이언트 인터랙션(스크롤, 옵저버 등) 검증이 필요한 기능이 반복된다면, Playwright 최소 설치를 별도 Plan으로 제안해 L2/L3 자동 테스트 기반을 마련한다.

---

## 7. Process Improvement Suggestions

### 7.1 PDCA Process

| Phase | Current | Improvement Suggestion |
|-------|---------|------------------------|
| Design | 상위 레이아웃 폭 제약을 사전 조사하지 않아 §11.1에 파일 누락 발생 | Design 체크리스트에 "영향받는 상위 레이아웃/컨테이너 CSS 확인" 항목 추가 |
| Check | 브라우저 런타임 동작(옵저버/이벤트)을 정적 코드 리뷰로만 검증 | 클라이언트 인터랙션이 포함된 기능은 Check 단계에서 "정적 검토 vs 런타임 미검증"을 명확히 구분해 보고 |

### 7.2 Tools/Environment

| Area | Improvement Suggestion | Expected Benefit |
|------|------------------------|------------------|
| Testing | Playwright 최소 설치 검토 (프로젝트 규모 대비 과함은 아닌지 사용자와 협의 필요) | L2 UI Action Test로 IntersectionObserver 등 클라이언트 로직 자동 검증 가능 |

---

## 8. Next Steps

### 8.1 Immediate

- [ ] `docs/02-design/features/note-toc.design.md` §11.1에 `app/(browse)/layout.tsx` 수정 사항 추가 (백로그, Critical 아님)
- [ ] `/pdca archive note-toc`로 문서 아카이브 (사용자 확인 후)

### 8.2 Next PDCA Cycle

| Item | Priority | Expected Start |
|------|----------|----------------|
| note-backlinks (이미 Plan 완료됨) | High | 사용자 지시 시 `/pdca design note-backlinks` |

---

## 9. Changelog

### v1.0.0 (2026-09-07)

**Added:**
- 노트 상세 페이지 우측 목차(TOC) 패널 — H1~H4 헤딩 자동 파싱, 클릭 이동, 스크롤 하이라이트
- `NoteHeading` 도메인 타입, `remarkExtractHeadings` remark 플러그인
- `github-slugger` 정식 의존성

**Changed:**
- `markdownToHtml` 반환 시그니처: `Promise<string>` → `Promise<{ html, headings }>`
- `(browse)` 레이아웃의 `<main>` 폭 제약 제거 (노트 상세 페이지가 자체 폭 정의)

**Fixed:**
- 없음 (신규 기능, 버그 수정 아님)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-09-07 | Completion report created — Match Rate 93% | SY LEE |

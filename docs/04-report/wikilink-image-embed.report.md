---
template: report
version: 1.1
---

# wikilink-image-embed Completion Report

> **Status**: Complete
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Completion Date**: 2026-09-04
> **PDCA Cycle**: #1

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | wikilink-image-embed |
| Start Date | 2026-09-04 |
| End Date | 2026-09-04 |
| Duration | 1 세션 |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Completion Rate: 96% (Match Rate)           │
├─────────────────────────────────────────────┤
│  ✅ Complete:      4 / 4 FR                  │
│  ⏳ In Progress:   0 / 4 FR                  │
│  ❌ Cancelled:     0 / 4 FR                  │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | `remarkWikilink`가 `!` 접두사(임베드 표시)를 무시해 `![[파일.webp\|1200]]`이 일반 위키링크로 처리되고, 존재하지 않는 slug라서 깨진 링크로 표시되던 문제. 실제 vault에서 117개 노트, 775개 이미지 임베드가 영향받았다. |
| **Solution** | `remarkWikilink`에서 `!` 여부로 임베드/링크를 구분해 이미지 확장자면 `<img>` mdast 노드로 변환하고, 빌드 타임에 실제 참조된 이미지만 `public/vault-assets/`로 복사해 정적 배포 완전 호환 방식으로 서빙했다. |
| **Function/UX Effect** | `투자/옵션거래` 등 스크린샷이 포함된 노트에서 이미지가 실제로 렌더링되며(`width` 크기 지정 포함), broken-link 오탐 경고가 사실상 소멸했다(서로 다른 이미지 기준 775/776건 해소). |
| **Core Value** | vault 콘텐츠를 Obsidian 원본과 동일하게 웹에서 재현한다는 뷰어 본연의 목적에 한 걸음 더 다가섰다. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|---------|:------:|----------|
| SC-1 | `투자/옵션거래` 등 이미지 임베드 포함 노트에서 이미지가 실제로 렌더링됨 | ✅ Met | `curl /notes/투자/옵션거래` → `<img src="/vault-assets/옵션거래-1781757712624.webp" width="1200">`, 이미지 자체도 200 응답 |
| SC-2 | 빌드 로그에서 이미지 확장자 관련 broken wikilink 경고가 사라짐 | ⚠️ Partial | 서로 다른 이미지 기준 775/776건 해소. vault 데이터상 `!` 없이 `[[파일.webp\|텍스트]]`로 참조된 1건은 Obsidian 문법상 일반 링크라 여전히 broken(코드 결함 아님, Analysis Gap 1 참조) |
| SC-3 | `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과 | ✅ Met | 세 명령 모두 오류 없이 통과 |
| SC-4 | 실제 VAULT_DIR로 빌드 후 브라우저에서 이미지 표시 수동 확인 | ✅ Met | dev 서버 curl 검증 + 정적 빌드 산출물(.html) 양쪽에서 확인 |

**Success Rate**: 3.5/4 criteria met (87.5%, Partial 1건은 코드 결함이 아닌 vault 데이터 특성)

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | 이미지 확장자 임베드만 처리, 노트-임베드는 out of scope | ✅ | `.json`/`.plan`/`.design` 임베드는 broken 경고 없이 원문 보존되도록 정확히 구현됨 |
| [Design] | Option C(빌드 타임 `public/vault-assets/` 복사) 선택 — 정적 배포 완전 호환 | ✅ | 서버 라우트/심볼릭 링크 없이 `copyFile` 기반으로 구현, 배포 환경 무관하게 동작 |
| [Design] | 실제 참조된 이미지만 복사해 산출물 크기 최소화 | ✅ | vault 전체(1104개, 79MB) 대비 817개(69MB)만 복사됨 확인 |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [wikilink-image-embed.plan.md](../01-plan/features/wikilink-image-embed.plan.md) | ✅ Finalized |
| Design | [wikilink-image-embed.design.md](../02-design/features/wikilink-image-embed.design.md) | ✅ Finalized |
| Check | [wikilink-image-embed.analysis.md](../03-analysis/wikilink-image-embed.analysis.md) | ✅ Complete (96%) |
| Act | Current document | ✅ Complete |

---

## 3. Completed Items

### 3.1 Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-01 | `![[파일.webp]]`, `![[파일.webp\|크기]]` 문법이 실제 `<img>` 태그로 렌더링된다 | ✅ Complete | `width` 속성 반영 확인 |
| FR-02 | 이미지 파일은 vault의 첨부 폴더에서 실제로 로드되어 화면에 보인다 | ✅ Complete | `public/vault-assets/` 경유 200 응답 확인 |
| FR-03 | 이미지가 아닌 임베드는 broken wikilink 경고를 발생시키지 않는다 | ✅ Complete | `.json` 임베드 원문 보존, 경고 없음 확인 |
| FR-04 | 존재하지 않는 이미지 파일 참조는 인지 가능한 형태로 표시된다 | ✅ Complete | `console.warn` + `<img>` alt 텍스트로 브라우저 기본 표시 |

### 3.2 Non-Functional Requirements

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| 빌드 방식 유지(SSG) | 정적 생성 유지 | `pnpm build` 283페이지 정적 생성 성공 | ✅ |
| 빌드 산출물 크기 | vault 전체 대비 축소 | 79MB/1104개 → 69MB/817개(실참조분만) | ✅ |

### 3.3 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| 임베드 파싱 로직 | `infrastructure/markdown/remarkWikilink.ts` | ✅ |
| 콜백 전달 통로 | `infrastructure/markdown/markdownToHtml.ts` | ✅ |
| 이미지 복사 로직 | `infrastructure/filesystem/FileSystemNoteRepository.ts` | ✅ |
| 빌드 산출물 gitignore | `.gitignore` (`public/vault-assets/` 추가) | ✅ |
| Plan/Design/Analysis 문서 | `docs/01-plan/`, `docs/02-design/`, `docs/03-analysis/` | ✅ |

---

## 4. Incomplete Items

### 4.1 Carried Over to Next Cycle

| Item | Reason | Priority | Estimated Effort |
|------|--------|----------|------------------|
| `FileSystemNoteRepository.findAll()` 캐싱 부재로 인한 broken-link 로그 중복 출력 | 이번 feature 범위 밖의 기존 구조적 이슈(Analysis Gap 2) | Medium | 별도 신규 feature로 분리 필요, 미산정 |

### 4.2 Cancelled/On Hold Items

| Item | Reason | Alternative |
|------|--------|-------------|
| - | - | - |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | Change |
|--------|--------|-------|--------|
| Design Match Rate | 90% | 96% | +6%p |
| Structural Match | - | 100% | - |
| Functional Depth | - | 95% | - |
| Contract Match | - | 100% | - |
| Runtime Match (L1) | - | 90% | - |
| typecheck/lint 오류 | 0 | 0 | ✅ |

### 5.2 Resolved Issues

| Issue | Resolution | Result |
|-------|------------|--------|
| `![[...]]` 이미지 임베드가 broken wikilink로 오표시됨 | `!` 접두사 캡처 후 임베드/링크 분기 처리 | ✅ Resolved (775/776건) |
| vault 외부 이미지가 Next.js 정적 사이트에서 서빙 불가 | 빌드 타임 `public/vault-assets/` 복사(Option C) | ✅ Resolved |
| 이미지 임베드가 노트 간 링크 그래프(`linkedSlugs`)에 잘못 포함될 위험 | `extractWikilinkSlugs`에서 `embedMark === '!'` 스킵 | ✅ Resolved |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)

- Plan 단계에서 vault의 실제 Obsidian 설정(`attachmentFolderPath: "Image"`)을 미리 확인해, Design의 이미지 검색 전략(첨부 폴더 우선 검색)을 근거 있게 세울 수 있었다.
- Design의 3가지 아키텍처 비교(Custom Route / Symlink / Build-time Copy)에서 "정적 배포 완전 호환"이라는 이 프로젝트의 기존 원칙(SSG 지향)을 기준으로 명확히 Option C를 선택할 수 있었다.
- 구현 직후 실제 VAULT_DIR로 빌드해 검증하는 습관 덕분에, Design 문서에는 없었던 예외 케이스(비-임베드 일반 링크가 이미지를 가리키는 vault 데이터 1건)를 조기에 식별했다.

### 6.2 What Needs Improvement (Problem)

- Design 문서가 "`!` 없이 이미지 파일을 일반 링크로 참조하는" 데이터 패턴까지는 예견하지 못해, Analysis 단계에서 Gap으로 뒤늦게 문서화됐다. 향후 Design 작성 시 vault 데이터를 grep으로 사전 스캔해 이런 예외 패턴을 미리 찾아두면 좋겠다.
- 검증 과정에서 `FileSystemNoteRepository.findAll()`의 캐싱 부재(기존 이슈)가 broken-link 로그를 노트 개수만큼 중복 출력시켜, 진짜 이미지 관련 경고와 기존 이슈로 인한 노이즈를 구분하는 데 추가 분석 시간이 들었다.

### 6.3 What to Try Next (Try)

- `FileSystemNoteRepository` 캐싱 부재 문제를 별도 PDCA 사이클(`note-repository-caching`)로 분리해 처리하면, 향후 모든 feature의 빌드 로그 검증이 더 명확해질 것이다.
- vault 데이터의 예외적 마크다운 패턴(임베드/링크 혼용 등)을 Plan 단계에서 `grep -c` 등으로 통계를 미리 뽑아두면 Design의 Error Handling 섹션이 더 완결성 있게 작성될 수 있다.

---

## 7. Process Improvement Suggestions

### 7.1 PDCA Process

| Phase | Current | Improvement Suggestion |
|-------|---------|------------------------|
| Plan | vault 데이터 통계는 대표 사례 위주로만 확인 | 관련 정규식/패턴에 대해 전수 `grep -c` 통계를 Plan 문서에 명시 |
| Design | 예외 데이터 패턴(비-임베드 이미지 링크 등)을 다루지 못함 | Error Handling 섹션 작성 전 vault 전수 스캔으로 엣지 케이스 발굴 |
| Check | 반복 로그(캐싱 부재)와 실제 신규 이슈를 수동으로 구분 | 로그 grep 시 `sort -u`로 고유 케이스만 추출하는 절차를 analyze 단계 표준으로 채택 |

### 7.2 Tools/Environment

| Area | Improvement Suggestion | Expected Benefit |
|------|------------------------|------------------|
| 빌드 캐싱 | `FileSystemNoteRepository`에 요청 스코프 캐싱 도입 | 빌드 로그 노이즈 감소, 빌드 시간 단축 가능성 |
| 테스트 | 프로젝트에 Vitest 등 테스트 러너 도입 | `buildNoteTree`, `remarkWikilink` 같은 순수 함수의 회귀 테스트 자동화 |

---

## 8. Next Steps

### 8.1 Immediate

- [x] `pnpm build` 최종 확인 완료
- [ ] Gap 1(비-임베드 이미지 링크 1건)은 vault 콘텐츠 수정 시 자연 해소 — 별도 조치 불필요
- [ ] `/pdca archive wikilink-image-embed` (다른 진행 중 feature 완료 후 일괄 정리 권장)

### 8.2 Next PDCA Cycle

| Item | Priority | Expected Start |
|------|----------|----------------|
| `note-repository-caching` (findAll 캐싱 부재 해소) | Medium | 미정 |
| 나머지 진행 중 feature(split-pane-layout, vault-recursive-read) analyze | High | 즉시 |

---

## 9. Changelog

### v0.1.0 (2026-09-04)

**Added:**
- Obsidian 이미지 임베드(`![[파일.webp]]`) 파싱 및 `<img>` 렌더링
- 빌드 타임 이미지 자산 복사 파이프라인(`public/vault-assets/`)

**Changed:**
- `remarkWikilink`가 `!` 접두사로 임베드/일반 링크를 구분하도록 정규식 확장
- `extractWikilinkSlugs`가 이미지 임베드를 노트 간 링크 그래프에서 제외

**Fixed:**
- 이미지 임베드가 broken wikilink로 오표시되던 문제(117개 노트, 775개 임베드 영향)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-09-04 | Completion report created | SY LEE |

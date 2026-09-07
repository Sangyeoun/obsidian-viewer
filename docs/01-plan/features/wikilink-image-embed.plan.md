---
template: plan
version: 1.3
---

# wikilink-image-embed Planning Document

> **Summary**: Obsidian 이미지 임베드 문법 `![[파일.webp]]`을 실제 `<img>`로 렌더링하고, 현재 이를 깨진 위키링크로 잘못 표시하는 버그를 수정한다.
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
| **Problem** | `remarkWikilink`가 `!` 접두사(임베드 표시)를 무시하고 `![[파일.webp\|1200]]`을 일반 위키링크로 처리해, 이미지가 있어야 할 자리에 "깨진 링크"(`wikilink-broken`)가 표시된다. 실제 vault에서 117개 노트·816개 임베드(그중 775개가 `.webp` 이미지)가 영향받는다. |
| **Solution** | `remarkWikilink`에서 `!` 접두사가 붙은 임베드 문법을 별도로 파싱해 실제 `<img>` 태그로 렌더링한다. 이미지 원본은 vault의 `Image/` 폴더(Obsidian `attachmentFolderPath` 설정)에 있으므로, 빌드 타임에 정적으로 서빙 가능한 경로로 연결한다. |
| **Function/UX Effect** | 노트 본문에 삽입된 스크린샷/다이어그램이 실제로 화면에 보이게 되어, 텍스트만으로는 이해하기 어려운 노트(예: `투자/옵션거래`)의 가독성이 크게 개선된다. |
| **Core Value** | vault 콘텐츠를 원본(Obsidian)과 동일하게 재현하는 뷰어 본연의 목적에 부합한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | `![[...]]` 임베드 문법이 일반 위키링크로 잘못 처리되어 이미지 자리에 깨진 링크 텍스트가 노출됨 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) — 스크린샷이 많이 포함된 노트를 웹에서 그대로 보고 싶어함 |
| **RISK** | vault(외부 경로)의 이미지 파일을 Next.js 정적 사이트에서 서빙하려면 빌드 타임 복사 또는 별도 라우트가 필요 — 방식에 따라 빌드 시간/산출물 크기 영향 |
| **SUCCESS** | `투자/옵션거래` 등 이미지 임베드가 있는 노트를 열었을 때 이미지가 실제로 렌더링되고, 콘솔에 더 이상 해당 이미지들이 broken wikilink로 경고되지 않음 |
| **SCOPE** | `.webp` 등 이미지 확장자 임베드만 처리(775/780건). `.json`/`.plan`/`.design` 같은 노트-임베드(다른 노트 삽입)는 out of scope |

---

## 1. Overview

### 1.1 Purpose

Obsidian의 이미지 임베드 문법을 올바르게 인식해 실제 이미지를 렌더링하고, 현재 발생 중인 대량의 오탐(false positive) 깨진 링크 경고를 제거한다.

### 1.2 Background

`split-pane-layout` 구현 후 실 vault로 검증하던 중, 빌드 로그에 `[wikilink] broken link: "옵션거래-1781757712624.webp" referenced from "투자/옵션거래"` 같은 경고가 다수(816건) 발생하는 것을 확인했다. 원인은 `infrastructure/markdown/remarkWikilink.ts:4`의 `WIKILINK_PATTERN`이 `[[...]]`만 매칭하고 앞의 `!`(Obsidian 임베드 표시)를 별도로 처리하지 않아, `![[파일.webp|1200]]`이 이미지가 아닌 일반 링크로 변환되기 때문이다. `.webp` 파일은 당연히 `.md` slug 목록에 없으므로 모두 "broken"으로 표시된다.

Obsidian 설정(`app.json`)을 확인한 결과 `attachmentFolderPath: "Image"`로, 모든 첨부파일이 vault 루트의 `Image/` 폴더에 평면 구조로 모여 있다.

### 1.3 Related Documents

- 관련 기존 기능: `docs/02-design/features/vault-recursive-read.design.md` (slug/파일 경로 구조)

---

## 2. Scope

### 2.1 In Scope

- [ ] `remarkWikilink`에서 `![[...]]`(임베드)와 `[[...]]`(일반 링크)를 구분해 파싱
- [ ] 이미지 확장자(`.webp`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg` 등)를 가진 임베드를 `<img>` 태그로 변환
- [ ] vault의 `Image/` 폴더(또는 Obsidian 설정에 따른 첨부폴더) 이미지를 Next.js 빌드 산출물에서 실제로 서빙 가능하게 연결
- [ ] 이미지가 아닌 임베드(`.json`, `.plan`, `.design` 등 노트/기타 파일 임베드)는 이번 범위에서 제외하되, 최소한 현재처럼 "broken"으로 오표시되지 않도록 처리 방침 결정

### 2.2 Out of Scope

- 다른 노트를 통째로 삽입하는 노트 임베드(`![[다른노트]]`) 렌더링
- 이미지 리사이징/최적화(Next.js `<Image>` 컴포넌트의 최적화 파이프라인 도입)
- PDF, 오디오 등 이미지 외 첨부파일 임베드

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `![[파일.webp]]`, `![[파일.webp\|크기]]` 문법이 실제 `<img>` 태그로 렌더링된다 | High | Pending |
| FR-02 | 이미지 파일은 vault의 첨부 폴더에서 실제로 로드되어 화면에 보인다 | High | Pending |
| FR-03 | 이미지가 아닌 임베드는 최소한 "broken wikilink" 경고를 발생시키지 않는다(별도 처리 또는 명시적으로 무시) | Medium | Pending |
| FR-04 | 존재하지 않는 이미지 파일을 참조하는 임베드는 여전히 사용자에게 인지 가능한 형태로 표시된다(예: alt 텍스트 또는 콘솔 경고) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 빌드 방식 유지 | 정적 생성(SSG) 기반 유지 | `pnpm build` 성공 확인 |
| 빌드 시간 | 이미지 복사로 인한 빌드 시간 증가가 수용 가능한 수준 | 빌드 전후 시간 비교 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `투자/옵션거래` 등 이미지 임베드 포함 노트에서 이미지가 실제로 렌더링됨
- [ ] 빌드 로그에서 이미지 확장자 관련 broken wikilink 경고가 사라짐
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과
- [ ] 실제 VAULT_DIR로 빌드 후 브라우저에서 이미지 표시 수동 확인

### 4.2 Quality Criteria

- [ ] 빌드 성공, lint/typecheck 오류 없음
- [ ] 기존 위키링크(노트 간 링크) 동작에 회귀 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 이미지 파일을 매 빌드마다 `public/`으로 복사하면 빌드 시간·산출물 크기가 커질 수 있음 | Medium | Medium | 첨부 폴더 규모 확인 후 복사 방식 vs 심볼릭 링크 vs Next.js 정적 파일 서빙 옵션을 Design 단계에서 비교 |
| Obsidian 첨부 폴더 설정이 vault마다 다를 수 있음(`attachmentFolderPath`) | Low | Low | 하드코딩된 `Image/` 대신 실제 임베드 파일을 vault 전체에서 재귀 검색하는 방식을 우선 고려 |
| 이미지가 아닌 임베드(`.json` 등)를 무시 처리할 때 사용자가 인지 못 할 수 있음 | Low | Low | 최소한 콘솔 경고는 별도 유형("embed-skipped")으로 남겨 구분 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `remarkWikilink` | 마크다운 플러그인 | 임베드(`!` 접두사) 파싱 로직 추가 |
| 이미지 서빙 경로 | 신규 | vault 첨부 이미지를 웹에서 접근 가능하게 하는 메커니즘 필요 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `remarkWikilink` | READ | `markdownToHtml.ts` → `FileSystemNoteRepository.readNote` | 기존 위키링크(노트 간) 처리 로직과 분기 필요, 회귀 없어야 함 |
| `extractWikilinkSlugs` | READ | `FileSystemNoteRepository.readNote`(linkedSlugs) | 이미지 임베드는 노트 간 링크 그래프에서 제외해야 함(현재는 슬러그로 오인되어 포함될 가능성) |

### 6.3 Verification

- [ ] 이미지 임베드가 `linkedSlugs`(노트 간 링크 그래프)에 잘못 포함되지 않는지 확인
- [ ] 기존 노트 간 위키링크(`[[노트명]]`)가 이번 변경 이후에도 정상 동작하는지 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Enterprise** (클린 아키텍처, 기존 유지) | 계층 분리 | 이 프로젝트의 기존 구조 | ☑ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 이미지 서빙 방식 | 빌드 타임 `public/` 복사 vs Next.js 커스텀 라우트 vs 심볼릭 링크 | Design 단계에서 결정 | Next.js 정적 익스포트/서버 컴포넌트 특성과 빌드 시간을 고려해 비교 필요 |
| 임베드 파싱 위치 | `remarkWikilink` 확장 vs 별도 `remarkEmbed` 플러그인 신설 | Design 단계에서 결정 | 기존 정규식/파서와의 결합도 대비 관심사 분리 트레이드오프 검토 필요 |

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `infrastructure/markdown/`에 remark 플러그인 추가 컨벤션 존재 (CLAUDE.md 명시)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| 이미지 경로 해석 규칙 | 없음 | vault 첨부 파일 검색/매핑 방식 | High |

### 8.3 Environment Variables Needed

신규 환경변수 없음(기존 `VAULT_DIR` 재사용).

---

## 9. Next Steps

1. [ ] `/pdca design wikilink-image-embed` 로 설계 문서 작성 (이미지 서빙 방식 확정)
2. [ ] 구현 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

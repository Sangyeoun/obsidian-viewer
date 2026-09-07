---
template: design
version: 1.3
---

# wikilink-image-embed Design Document

> **Summary**: Obsidian 이미지 임베드 문법(`![[파일.webp]]`)을 인식해 실제 `<img>`로 렌더링하고, 참조된 이미지만 빌드 타임에 `public/vault-assets/`로 복사해 정적으로 서빙한다.
>
> **Project**: obsidian-viewer
> **Version**: 0.1.0
> **Author**: SY LEE
> **Date**: 2026-09-04
> **Status**: Draft
> **Planning Doc**: [wikilink-image-embed.plan.md](../01-plan/features/wikilink-image-embed.plan.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | `remarkWikilink`가 `!` 접두사(임베드)를 무시해 `![[파일.webp\|1200]]`이 일반 위키링크로 처리되고, 존재하지 않는 slug라서 "broken"으로 표시된다(117개 노트, 775개 이미지 임베드 영향). |
| **Solution** | `remarkWikilink`에서 임베드 문법을 별도 파싱해 이미지 확장자면 `<img>` 노드로 변환하고, 빌드 타임에 실제 참조된 이미지 파일만 vault에서 찾아 `public/vault-assets/`로 복사한다. |
| **Function/UX Effect** | 노트 본문의 스크린샷/다이어그램이 실제로 렌더링되며, 콘솔의 오탐 broken-link 경고가 사라진다. |
| **Core Value** | vault 콘텐츠를 원본과 동일하게 재현한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | `![[...]]` 임베드 문법이 일반 위키링크로 잘못 처리되어 이미지 자리에 깨진 링크 텍스트가 노출됨 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) — 스크린샷이 많이 포함된 노트를 웹에서 그대로 보고 싶어함 |
| **RISK** | vault(외부 경로)의 이미지 파일을 Next.js 정적 사이트에서 서빙하려면 빌드 타임 복사 또는 별도 라우트가 필요 — 방식에 따라 빌드 시간/산출물 크기 영향 |
| **SUCCESS** | `투자/옵션거래` 등 이미지 임베드가 있는 노트를 열었을 때 이미지가 실제로 렌더링되고, 콘솔에 더 이상 해당 이미지들이 broken wikilink로 경고되지 않음 |
| **SCOPE** | `.webp` 등 이미지 확장자 임베드만 처리(775/780건). `.json`/`.plan`/`.design` 같은 노트-임베드는 out of scope |

---

## 1. Overview

### 1.1 Design Goals

- 정적 사이트 생성(SSG) 특성을 유지하며 배포 후 추가 서버 로직 없이 이미지를 서빙한다.
- 실제로 참조된 이미지 파일만 복사해 불필요한 빌드 산출물 증가를 최소화한다(vault에는 1104개 파일·79MB가 있지만 실제 참조는 일부).
- 기존 `remarkWikilink`의 노트 간 링크 처리(끊긴 링크 감지 등)에 회귀가 없어야 한다.

### 1.2 Design Principles

- 단일 책임 확장: `remarkWikilink`는 이제 "위키링크"와 "임베드" 두 문법을 처리하지만, 내부적으로 명확히 분기해 관심사를 분리한다.
- 빌드 타임 부작용 최소화: 이미지 복사는 `FileSystemNoteRepository`가 노트를 읽는 기존 흐름에 자연스럽게 편입한다.
- 실패에 관대하게: 이미지 파일을 찾지 못해도 빌드가 깨지지 않고, 콘솔 경고 + `alt` 텍스트로 사용자에게 알린다.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Custom Route | Option B: Symlink | Option C: Build-time Copy |
|----------|:-:|:-:|:-:|
| **Approach** | 온디맨드 동적 라우트로 VAULT_DIR에서 직접 서빙 | `public/vault-assets`를 vault Image 폴더로 심볼릭 링크 | 참조된 파일만 빌드 시 `public/`으로 복사 |
| **New Files** | 1 (route.ts) | 0 (빌드 스크립트만) | 1 (이미지 복사 유틸) |
| **Modified Files** | 1 | 1 | 2 |
| **Complexity** | Medium | Low | Medium |
| **Deploy Compatibility** | 서버 런타임 필요, 정적 배포 불가 | 배포 환경에 따라 깨질 수 있음(Vercel 등) | 순수 정적 파일, 모든 배포 환경 호환 |
| **Effort** | Medium | Low | Medium |
| **Risk** | High(프로젝트의 SSG 지향과 불일치) | Medium(심볼릭 링크 미지원 환경 위험) | Low |
| **Recommendation** | 비권장 | 로컬 전용이면 고려 가능 | **Default choice** |

**Selected**: Option C — **Rationale**: 이 프로젝트는 `pnpm build`로 완전한 정적 사이트를 생성하는 것을 전제로 하며(기존 `vault-recursive-read`, `split-pane-layout` 모두 SSG 유지), 배포 환경에 무관하게 동작해야 한다. 빌드 타임에 실제 참조된 이미지만 복사하면 산출물 증가를 최소화하면서 완전한 정적 배포 호환성을 확보할 수 있다.

### 2.1 Component Diagram

```
FileSystemNoteRepository.readNote(slug, filePath, ...)
  → markdownToHtml(content, { ..., onImageEmbed })
       → remarkWikilink: ![[파일.webp|1200]] 감지
            → 임베드 여부 판단(! 접두사) → 이미지 확장자 판단
            → <img> mdast 노드 생성, url: `/vault-assets/{원본파일명}`
            → onImageEmbed(원본파일명) 콜백 호출 (수집용)
  → FileSystemNoteRepository: 수집된 파일명들을 vault에서 검색해 public/vault-assets/로 복사
```

### 2.2 Data Flow

```
빌드 시작
  → FileSystemNoteRepository.findAll() / findBySlug()
       → 각 노트의 markdown 파싱 중 이미지 임베드 파일명 수집(Set<string>, 전역)
  → 노트 파싱 완료 후, 수집된 파일명 각각에 대해:
       1. vault의 Image/ 폴더에서 우선 검색
       2. 없으면 vault 전체 재귀 검색(첨부 폴더 설정이 다른 경우 대비)
       3. 찾으면 public/vault-assets/{파일명}으로 복사(이미 복사됐으면 skip)
       4. 못 찾으면 console.warn + 해당 <img>는 깨진 이미지로 남음(브라우저 alt 텍스트 표시)
  → pnpm build 완료 시 public/vault-assets/ 에 참조된 이미지들만 존재
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `remarkWikilink` | 없음(순수 파싱 확장) | `![[...]]` 임베드를 `<img>` mdast 노드로 변환 |
| `FileSystemNoteRepository` | `node:fs/promises`(`copyFile`, `mkdir`) | 참조된 이미지를 vault에서 찾아 `public/vault-assets/`로 복사 |

---

## Detailed Design

> 아래 §3~§9에서 데이터 모델, UI, 에러 처리, 보안, 테스트, 아키텍처 배치를 상세히 다룬다.

---

## 3. Data Model

### 3.1 신규 개념: ImageEmbedTarget

```typescript
// remarkWikilink 내부에서 파싱 시 사용하는 개념(별도 export 타입 불필요, 인라인 처리)
// 임베드 문법 파싱 결과
interface ParsedEmbed {
  readonly rawTarget: string   // 'img.webp|1200' 형태의 원본 캡처
  readonly fileName: string    // 'img.webp'
  readonly displayWidth?: string // '1200' (파이프 뒤 크기 지정, 있으면)
  readonly isImage: boolean    // 확장자가 이미지 목록에 포함되는지
}
```

### 3.2 이미지 확장자 목록

```typescript
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])
```

---

## 4. API Specification

해당 없음 (정적 파일 기반, HTTP API 없음). `public/vault-assets/{파일명}`은 Next.js가 기본 제공하는 `public/` 정적 서빙 규칙을 그대로 사용한다.

---

## 5. UI/UX Design

### 5.1 렌더링 결과 예시

```
Markdown: ![[옵션거래-1781757712624.webp|1200]]
HTML:     <img src="/vault-assets/옵션거래-1781757712624.webp" alt="옵션거래-1781757712624.webp" width="1200" />
```

### 5.4 Page UI Checklist

#### `/notes/투자/옵션거래` (이미지 임베드 포함 노트)

- [ ] 본문 중간에 실제 이미지(스크린샷)가 렌더링됨
- [ ] 이미지에 `width` 속성(Obsidian의 `|1200` 크기 지정)이 반영됨
- [ ] 존재하지 않는 이미지를 참조하는 임베드는 깨진 이미지 아이콘 + alt 텍스트로 표시(브라우저 기본 동작)

---

## 6. Error Handling

### 6.1 Error Case 정의

| Case | 원인 | 처리 |
|------|------|------|
| 참조된 이미지 파일이 vault 어디에도 없음 | 오타, 삭제된 첨부파일 | `console.warn`으로 경고(`[image-embed] not found: ...`), `<img>`는 그대로 두어 브라우저가 깨진 이미지로 표시(alt 텍스트 노출) |
| 이미지가 아닌 파일 확장자의 임베드(`.json`, `.plan`, `.design`) | 노트/기타 파일 임베드(out of scope) | `<img>`로 변환하지 않고, 기존처럼 링크로 두되 broken 경고 대신 별도 문구("embed-skipped")로 구분해 오탐을 줄임 |
| 동일 파일명이 vault 여러 위치에 존재 | 이름 충돌 | `nameToSlugMap`과 동일하게 첫 매칭 사용 + 경고 |

---

## 7. Security Considerations

- [x] 경로 순회 방지: 복사 대상 파일명은 vault 내부에서 실제로 발견된 파일 경로에서만 파생되며, 마크다운 텍스트의 임의 문자열을 직접 파일 경로로 사용하지 않는다(파일명으로 vault 내부를 검색한 결과만 사용).
- [x] `public/vault-assets/` 파일명은 원본 파일명을 그대로 사용하되, 검색 결과로 확인된 실제 파일만 복사하므로 임의 경로 접근 위험 없음.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Manual | 임베드 파싱, 이미지 복사, 렌더링 | `pnpm build` + 브라우저 확인 | Check |

> 테스트 러너 미설정으로 수동 시나리오로 검증(Section 4 Regression Test Exception 해당).

### 8.2 검증 시나리오

| # | 시나리오 | 절차 | 기대 결과 |
|---|----------|------|-----------|
| 1 | 이미지 임베드 렌더링 | `/notes/투자/옵션거래` 접속 | 본문에 실제 이미지가 보임 |
| 2 | 크기 지정 반영 | 위 노트에서 `\|1200` 지정된 이미지 | `<img>`에 `width="1200"` 반영 확인(DOM 검사) |
| 3 | 존재하지 않는 이미지 | 임의로 없는 파일명 임베드 테스트 | 콘솔 경고 발생, 화면엔 깨진 이미지 아이콘 |
| 4 | 노트 임베드(비이미지) | `.json`/`.plan` 임베드 포함 노트 | broken wikilink 경고 대신 별도 스킵 처리 확인 |
| 5 | 기존 위키링크 회귀 확인 | `[[노트명]]` 일반 링크 포함 노트 | 기존과 동일하게 정상 링크 동작 |
| 6 | 빌드 산출물 크기 확인 | `pnpm build` 후 `public/vault-assets/` 크기 확인 | vault 전체(79MB)가 아닌 실제 참조분만 복사됨 |
| 7 | 빌드 로그 확인 | `pnpm build` 실행 | 이미지 확장자 관련 `[wikilink] broken link` 경고가 더 이상 나타나지 않음 |

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location | 변경 내용 |
|-----------|-------|----------|-----------|
| `remarkWikilink` | Infrastructure | `infrastructure/markdown/remarkWikilink.ts` | 임베드(`!` 접두사) 파싱 분기 추가, 이미지 확장자 판단 후 `<img>` mdast 노드 생성 |
| `markdownToHtml` | Infrastructure | `infrastructure/markdown/markdownToHtml.ts` | 이미지 임베드 수집 콜백 전달 통로 추가(선택적) |
| `FileSystemNoteRepository` | Infrastructure | `infrastructure/filesystem/FileSystemNoteRepository.ts` | 참조된 이미지 파일명을 vault에서 찾아 `public/vault-assets/`로 복사하는 로직 추가 |

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| 확장자 판단 | 명명된 상수 `IMAGE_EXTENSIONS`(Set)로 매직 스트링 방지 |
| 이미지 자산 경로 | `public/vault-assets/` 하위에 원본 파일명 그대로(경로 충돌 시 첫 매칭 + 경고, 기존 `nameToSlugMap` 패턴과 일관) |

---

## Implementation Order

1. [ ] `remarkWikilink`: `WIKILINK_PATTERN` 앞에 `!` 여부를 함께 캡처하도록 정규식 확장, 임베드(`!` 있음)인 경우 별도 분기
2. [ ] 임베드 파싱 분기: 파일명과 표시 옵션(`|숫자`)을 분리, `IMAGE_EXTENSIONS`로 이미지 여부 판단
3. [ ] 이미지 임베드 → `<img>` mdast 노드 생성(`url: /vault-assets/{파일명}`, `width` 속성은 표시 옵션에서 파생), 링크 그래프(`extractWikilinkSlugs`)에서는 제외
4. [ ] 이미지가 아닌 임베드 → 기존 링크 변환 로직 재사용하되 `wikilink-broken` 대신 구분되는 클래스/경고 문구 사용
5. [ ] `FileSystemNoteRepository`에 이미지 파일명 수집 + `public/vault-assets/`로 복사하는 로직 추가 (전체 노트 파싱 후 1회 실행)
6. [ ] `pnpm typecheck` / `pnpm lint` / `pnpm build` 확인
7. [ ] 실제 VAULT_DIR로 빌드 후 §8.2 시나리오 수동 확인

### Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 임베드 파싱 | `module-1` | remarkWikilink 임베드 분기, markdownToHtml 연결 | 20-25 |
| 이미지 복사 | `module-2` | FileSystemNoteRepository 이미지 수집·복사 로직 | 15-20 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1,module-2` (단일 세션 권장) | 35-45 |
| Session 3 | Check + Report | 전체 | 20-30 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial draft | SY LEE |

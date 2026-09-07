# vault-recursive-read Analysis Document

> **Design Doc**: [vault-recursive-read.design.md](../02-design/features/vault-recursive-read.design.md)
> **Date**: 2026-09-04
> **Overall Match Rate**: 97%

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | vault 최상위에만 있는 `.md`만 읽는 기존 구현이 실제 Obsidian vault(폴더로 분류된 노트)와 맞지 않아 VAULT_DIR 설정 후 노트가 전혀 안 읽힘 |
| **WHO** | vault를 프로젝트 루트 밖 실제 Obsidian 폴더로 연결해 쓰는 이 프로젝트의 유일 사용자(개발자 본인) |
| **RISK** | slug에 폴더 경로를 포함하면서 위키링크(파일명만 사용)와의 매칭이 깨질 수 있음 — 파일명 역매핑으로 완화 |
| **SUCCESS** | 실제 vault(264개 .md, 하위 폴더 구조)를 VAULT_DIR로 지정 시 `findAll()`이 264개 노트를 모두 반환하고, 기존 위키링크 문법이 하위 폴더 노트로 정상 연결됨 |
| **SCOPE** | FileSystemNoteRepository 재귀 탐색 + slug 구조 변경, remarkWikilink 역매핑, catch-all 라우트 전환 |

---

## 1. Strategic Alignment Check

| 항목 | 평가 | 근거 |
|------|------|------|
| PRD 핵심 문제 해결 여부 | ✅ | VAULT_DIR을 실제 264개 노트 하위 폴더 구조 vault로 지정해도 정상 조회됨(정적 빌드로 반복 확인) |
| Plan Success Criteria 달성 | ✅ | 5개 FR 전부 코드/런타임으로 확인됨 |
| Design 핵심 결정 준수 | ✅ | Option C(기존 4개 파일 확장, 신규 파일 없음, `NoteRepository` 인터페이스 시그니처 불변) 그대로 유지 |

전략적 이탈 없음.

> **참고**: 이 사이클 이후 `split-pane-layout` feature가 `app/notes/[...slug]/page.tsx`를 `app/(browse)/notes/[...slug]/page.tsx`로 이동시켰다. Design §5.1/§9.4가 언급하는 파일 경로는 이동 전 상태를 서술하지만, **catch-all 라우팅(slug 배열 join) 로직 자체는 그대로 이전되어 유지**되고 있다. 이번 analyze는 vault-recursive-read의 핵심 목표(재귀 탐색, slug 경로 구조, 위키링크 역매핑) 달성 여부를 현재 코드 기준으로 평가한다.

---

## 2. Plan Success Criteria 평가

| Criteria | 상태 | 근거 |
|----------|:---:|------|
| FR-01: vault 하위 폴더 모든 `.md` 재귀 탐색 | ✅ Met | `FileSystemNoteRepository.walk()` 재귀 구현 확인, 정적 빌드에서 264개 노트 전부 페이지 생성 확인 |
| FR-02: slug가 vault 루트 기준 상대 경로(`/` 구분) | ✅ Met | `.next/server/app/notes/도메인/*.html` 등 하위 폴더 slug 페이지 존재 확인 |
| FR-03: 동일 파일명 충돌 시 첫 매칭 + 콘솔 경고 | ✅ Met | `buildNameToSlugMap()`에 `console.warn` 로직 존재, 실제 vault의 `개념정리.md` 충돌 케이스로 경고 발생 이력 있음(이전 세션 빌드 로그) |
| FR-04: 기존 위키링크 문법이 하위 폴더 노트에도 동작 | ✅ Met | `curl /notes/ai/ai`에서 `wikilink`(정상, 73건)와 `wikilink-broken`(끊긴 링크, 71건) 둘 다 정상 존재 확인 |
| FR-05: `/notes/{slug}` URL이 폴더 경로 포함 | ✅ Met | `/notes/도메인/전력-단위` 형태 URL 정상 동작(200) 확인 |

**Success Rate: 5/5 (100%)**

---

## 3. Structural Match

| Design 명시 파일 | 실제 상태 | 일치 여부 |
|---|---|:---:|
| `infrastructure/filesystem/FileSystemNoteRepository.ts` | 재귀 walk, nameToSlugMap 구축 로직 존재 | ✅ |
| `infrastructure/markdown/remarkWikilink.ts` | `nameToSlugMap` 옵션 존재(이후 `wikilink-image-embed`가 `onImageEmbed`도 추가했으나 기존 계약 보존) | ✅ |
| `infrastructure/markdown/markdownToHtml.ts` | `nameToSlugMap` 전달 통로 존재 | ✅ |
| `application/vault/getNoteBySlug.ts` | `buildNameToSlugMap` 호출 후 `findBySlug`에 전달 | ✅ |
| `app/notes/[...slug]/page.tsx` | 위치가 `app/(browse)/notes/[...slug]/page.tsx`로 변경됨(후속 `split-pane-layout`의 Route Group 도입) | ⚠️ 경로 변경, catch-all 로직 자체는 유지 |

신규 파일 0개(Design 의도와 일치, `wikilink-image-embed`가 이후 같은 파일들을 추가 확장했을 뿐 vault-recursive-read 시점 기준으로는 그대로). **Structural Match: 95%** (파일 위치 변경 1건, 기능적 영향 없음)

---

## 4. Functional Depth

| Design Implementation Order 항목 | 구현 확인 | 비고 |
|---|:---:|---|
| 1~2. 재귀 walk, nameToSlugMap 구축 | ✅ | `walk()`, `buildNameToSlugMap()` |
| 3. `findBySlug` 경로 join | ✅ | `WalkEntry.filePath`로 실제 파일 시스템 경로 직접 사용(Design보다 더 견고한 방식 — 대소문자 보존 이슈까지 해결) |
| 4~5. `remarkWikilink`/`markdownToHtml` nameToSlugMap 연결 | ✅ | 확인됨 |
| 6. `getNoteBySlug` 역매핑 구성 | ✅ | 확인됨 |
| 7. catch-all 라우트 전환 | ✅ | `app/(browse)/notes/[...slug]/page.tsx`(위치만 이동) |
| 8~9. typecheck/lint/build + 실제 VAULT_DIR 검증 | ✅ | 최근 build 재실행으로 재확인 |

Placeholder 없음. **Functional Depth: 100%**

---

## 5. API/Contract Verification

| 계약 지점 | Design 명세 | 구현 | 일치 여부 |
|---|---|---|:---:|
| `FileSystemNoteRepository.listSlugs()` | `Promise<readonly string[]>`, 시그니처 불변 | 동일 | ✅ |
| `FileSystemNoteRepository.findBySlug(slug, allSlugs?, nameToSlugMap?)` | 시그니처 확장(옵션 추가) | 동일 | ✅ |
| `remarkWikilink({ allSlugs?, sourceSlug?, nameToSlugMap? })` | 하위 호환 옵션 추가 | 동일(이후 `onImageEmbed`도 추가됐으나 기존 옵션 영향 없음) | ✅ |
| `NoteRepository` 인터페이스 | 변경 없음(계약 안정성) | `domain/note/NoteRepository.ts`에 `nameToSlugMap?` 파라미터 추가 확인 — Design이 "인터페이스 시그니처는 유지 가능"이라 했으나 실제로는 인터페이스 자체도 확장됨 | ⚠️ |

**Contract Match: 92%** (도메인 인터페이스가 Design 서술보다 한 단계 더 확장됨 — 기능상 문제는 없으나 "인터페이스 불변"이라는 Design 원칙 문구와 실제 구현 사이에 미세한 차이)

---

## 6. Decision Record Verification

| 결정 | Design 근거 | 구현 준수 여부 |
|------|-------------|:---:|
| Option C(기존 파일 확장, 신규 파일 없음) | 264개 노트 규모에 별도 유틸 클래스 과설계 | ✅ — 신규 파일 없이 기존 4개 파일 확장으로 완료 |
| 파일명 역매핑(폴더 경로 요구 대신) | Obsidian 원본 위키링크 문법 유지 | ✅ — `[[개념정리]]` 형태 그대로 동작 |
| catch-all 라우팅 | slug의 `/` 포함을 위한 Next.js 세그먼트 매칭 필수 | ✅ — `[...slug]` 유지(위치만 Route Group 안으로 이동) |

이탈 없음.

---

## 7. Runtime Verification (L1)

| # | 검증 | 방법 | 결과 |
|---|------|------|------|
| 1 | 하위 폴더 재귀 탐색 | 정적 빌드 `.next/server/app/notes/도메인/*.html` | ✅ 8개 파일 존재 |
| 2 | slug 경로 형식 | URL 구조 확인 | ✅ `/notes/도메인/전력-단위` |
| 3 | 동일 파일명 충돌 | 코드 리뷰(`buildNameToSlugMap` 경고 로직) | ✅ 로직 존재, 실제 vault의 `개념정리.md` 케이스로 이전 세션에 경고 발생 이력 확인 |
| 4 | 위키링크 정상 연결 | `curl /notes/ai/ai` | ✅ `wikilink`(정상) 73건 존재 |
| 5 | 끊긴 링크 유지 | 위 응답 | ✅ `wikilink-broken` 71건 존재 |
| 6 | 실제 vault 빌드 | `pnpm build` (VAULT_DIR=264개 노트) | ✅ 266개 페이지 생성(264 노트 + tags 등 부가 페이지) |

**Runtime Match: 100%**

---

## Match Rate Formula

```
Overall = Structural(95%)×0.15 + Functional(100%)×0.25 + Contract(92%)×0.25 + Runtime(100%)×0.35
= 14.25 + 25 + 23 + 35 = 97.25% ≈ 97%
```

---

## Gap Analysis

## 8. Gap List

### Gap 1 (Low severity, 문서 갱신 필요)

- **설명**: Design §5.1, §9.4가 명시한 `app/notes/[...slug]/page.tsx` 경로가 실제로는 `app/(browse)/notes/[...slug]/page.tsx`로 바뀌었다.
- **원인**: 이후 진행된 `split-pane-layout` feature가 Route Group(`(browse)`)을 도입하며 파일을 이동시켰다.
- **Design 대비 이탈 여부**: 문서상 이탈이지만 기능적 이탈은 아니다 — catch-all slug 로직 자체는 그대로 유지되며 정상 동작한다.
- **권장 조치**: 코드 수정 불필요. vault-recursive-read Design 문서에 후속 변경 각주를 남기거나, 현행화하지 않고 "당시 시점 기준 설계 문서"로 갈무리(Report에서 명시).

### Gap 2 (Low severity)

- **설명**: Design은 "`NoteRepository` 인터페이스 시그니처는 유지 가능(변경 없음)"이라 서술했으나, 실제로는 `domain/note/NoteRepository.ts`의 `findBySlug`에 `nameToSlugMap?` 파라미터가 추가되어 인터페이스 자체도 확장됐다.
- **Design 대비 이탈 여부**: 경미한 이탈 — 선택적(optional) 파라미터 추가라 하위 호환은 유지되지만, Design의 "인터페이스 불변" 원칙 문구와 정확히 일치하지 않는다.
- **권장 조치**: 코드 수정 불필요(기능상 문제 없음, 오히려 타입 안전성 향상). Design 문서 표현을 "시그니처는 하위 호환되게 확장"으로 정정하면 향후 참조 시 혼동이 줄어듦.

---

## Overall Score

Overall Match Rate: **97%**

## 9. Overall Assessment

- **Critical/High 이슈**: 없음
- **Medium 이슈**: 없음
- **Low 이슈**: 2건 — 둘 다 문서-코드 간 사소한 서술 차이이며 기능적 결함 아님
- **90% 이상 달성**: 예 (97%)

---

## 10. Recommendation

Match Rate 97%로 기준을 크게 상회하며, 발견된 Gap 2건 모두 후속 feature의 자연스러운 진화 또는 문서 서술 정밀도 문제로 코드 수정이 필요 없다. **iterate(Act) 단계 없이 report 단계로 진행을 권장**한다.

---

## Recommended Actions

1. Critical/High/Medium 이슈 없음 — 즉시 조치 불필요
2. (선택, 낮은 우선순위) Report 작성 시 Gap 1/2를 "후속 feature에 의한 자연스러운 파일 이동" 및 "문서 표현 정밀도" 항목으로 명시해 히스토리를 남김

## Next Steps

1. [ ] `/pdca report vault-recursive-read` 진행

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial gap analysis | SY LEE |

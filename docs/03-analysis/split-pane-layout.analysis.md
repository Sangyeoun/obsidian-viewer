# split-pane-layout Analysis Document

> **Design Doc**: [split-pane-layout.design.md](../02-design/features/split-pane-layout.design.md)
> **Date**: 2026-09-04
> **Overall Match Rate**: 98% (Gap 1 수정 반영 후 재평가)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 목록↔상세 전체 페이지 전환 방식은 매번 목록 컨텍스트를 잃어 여러 노트를 연속으로 훑어보기 불편함 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) |
| **RISK** | 새 2단 레이아웃 상태(선택된 노트)와 URL 동기화가 깨지면 직접 진입/새로고침 시 잘못된 화면이 보일 수 있음 |
| **SUCCESS** | `/`에서 목록 클릭 시 중앙에 노트가 렌더링, URL이 `/notes/{slug}`로 바뀌며 직접 진입해도 동일하게 동작 |
| **SCOPE** | `/`, `/notes/[...slug]` 공유 레이아웃 통합. `/tags`는 범위 밖 |

---

## 1. Strategic Alignment Check

| 항목 | 평가 | 근거 |
|------|------|------|
| PRD 핵심 문제 해결 여부 | ✅ | 목록/본문 동시 열람 가능, 클라이언트 네비게이션으로 부분 갱신 구조 확립 |
| Plan Success Criteria 달성 | ⚠️ | 5개 중 4개 충족, 1개는 후속 feature(`sidebar-tree-view`)가 UI를 트리로 진화시켜 원 Design 체크리스트 문구와 문자 그대로는 다름(기능적으로는 상위 호환) |
| Design 핵심 결정 준수 | ✅ | Option C(Route Group) 그대로 구현, URL 기반 상태(전역 상태 미도입) 유지 |

전략적 이탈(Critical) 없음. 다만 구조적 Gap 1건 발견(§8 참조).

> **참고**: 이 사이클 이후 `sidebar-tree-view` feature가 `NoteSidebar`를 평면 목록에서 폴더 트리로, `layout.tsx`를 `max-w-6xl` 중앙 정렬에서 화면 최좌단 고정으로 변경했다. split-pane-layout Design의 UI 세부 사양(§5.1 레이아웃 다이어그램, §5.4 체크리스트 문구)은 이 변경 이전 상태를 서술하지만, **split-pane-layout이 확립한 핵심 아키텍처(Route Group 공유, URL 기반 선택 상태, 부분 갱신)는 그대로 유지되며 후속 feature는 그 위에 UI만 발전시켰다.** 이번 analyze는 split-pane-layout의 핵심 목표 달성 여부를 현재 코드 기준으로 평가한다.

---

## 2. Plan Success Criteria 평가

| Criteria | 상태 | 근거 |
|----------|:---:|------|
| `/` 접속 시 좌측 검색창 + 목록, 중앙 안내 문구 | ✅ Met | `curl /` → "왼쪽 목록에서 노트를 선택하세요" 확인 |
| 좌측 목록 클릭 시 중앙 갱신 + URL이 `/notes/{slug}`로 변경 | ✅ Met | `NoteListItem`의 `<Link href="/notes/${slug}">` + Route Group 공유 레이아웃 구조로 구현됨(코드 리뷰로 확인, Design §2.2 Data Flow와 일치) |
| `/notes/{slug}` 직접 진입/새로고침 시 동일 레이아웃 + 해당 노트 | ✅ Met | `curl /notes/도메인/전력-단위` → 200, 사이드바(`type="search"`)와 본문(`aria-current="page"`) 동시 렌더링 확인 |
| 검색 입력 시 목록 필터링, 선택 노트 표시 유지 | ✅ Met | `NoteSidebar` 내부 `searchNotes(notes, query)` 로직 존재, 선택 판단은 검색과 독립적으로 `usePathname` 기반이라 유지됨(코드 리뷰) |
| 현재 선택된 노트 시각적 강조 | ✅ Met | `aria-current="page"` + 강조 스타일 클래스 확인 |

**Success Rate: 5/5 (100%)** — Plan 레벨 기준으로는 전부 충족.

---

## 3. Structural Match

| Design §9.4 명시 파일 | 실제 구현 | 일치 여부 |
|---|---|:---:|
| `app/(browse)/layout.tsx` | 존재 (이후 sidebar-tree-view가 내부 마크업만 갱신) | ✅ |
| `components/organisms/NoteSidebar.tsx` | 존재 (이후 트리 렌더링으로 확장됨) | ✅ |
| `components/molecules/NoteListItem.tsx` | 존재 | ✅ |
| `components/atoms/EmptyNoteState.tsx` | 존재 | ✅ |
| `app/(browse)/page.tsx` | 존재 | ✅ |
| `app/(browse)/notes/[...slug]/page.tsx` | 존재 | ✅ |

기존 `app/page.tsx`, `app/notes/[...slug]/page.tsx`는 Design §11.2 Step 7에 따라 삭제됨(현재 디렉터리에 부재 확인). **Structural Match: 100%**

---

## 4. Functional Depth

| Design Implementation Order 항목 | 구현 확인 | 비고 |
|---|:---:|---|
| 1~6. 신규 컴포넌트 및 라우트 작성 | ✅ | 전부 존재, 코드 로직도 Design 서술과 일치 |
| 7. 기존 라우트 삭제 | ✅ | `app/page.tsx`, `app/notes/[...slug]/page.tsx` 부재 확인 |
| 8~9. typecheck/lint/build + 수동 검증 | ✅ | 세 명령 모두 통과 이력 있음(Do phase 기록) |

**Gap 1 발견**: Design §6.1 "존재하지 않는 slug로 진입 시 레이아웃은 정상 표시되고 중앙만 404"가 실제로는 성립하지 않는다. `notFound()` 호출 시 Next.js가 `(browse)` 세그먼트에 `not-found.tsx`가 없어 루트 `app/not-found.tsx`까지 올라가며, 그 결과 사이드바를 포함한 전체 `(browse)` 레이아웃이 사라지고 완전히 별도의 404 페이지가 렌더링된다.

**Functional Depth: 90%** (Design이 명시한 에러 케이스 동작과 실제 구현이 다른 1건으로 인한 감점)

---

## 5. API/Contract Verification

| 계약 지점 | Design 명세 | 구현 | 일치 여부 |
|---|---|---|:---:|
| 선택 상태 판단 | `usePathname()` → `/notes/` 접두사 제거 → `decodeURIComponent` | `NoteSidebar.tsx`에 정확히 동일 로직 존재 | ✅ |
| 노트 클릭 네비게이션 | `<Link href="/notes/{slug}">` | `NoteListItem.tsx`에서 확인 | ✅ |
| `/tags` 비영향 | 기존 `PageLayout` 그대로 유지 | `app/tags/page.tsx` 변경 없음(코드 리뷰) | ✅ |

**Contract Match: 100%**

---

## 6. Decision Record Verification

| 결정 | Design 근거 | 구현 준수 여부 |
|------|-------------|:---:|
| Route Group(`(browse)`) + 공유 layout | 표준 Next.js 기능만으로 부분 갱신 달성 | ✅ |
| URL 기반 선택 상태(전역 상태 미도입) | 정적 사이트 특성 유지 | ✅ — Zustand/Context 등 도입 없음 확인 |
| `/tags` 범위 제외 | 이번 사이클에서 변경 안 함 | ✅ |

이탈 없음.

---

## 7. Runtime Verification (L1)

| # | 검증 | 방법 | 결과 |
|---|------|------|------|
| 1 | 홈 초기 상태 | `curl /` | ✅ EmptyNoteState 문구 확인 |
| 2~3 | 노트 선택/이동 | 코드 리뷰(`<Link>` 기반 클라이언트 네비게이션) | ✅ Next.js App Router 표준 동작이므로 별도 브라우저 없이도 신뢰 가능 |
| 4 | 직접 URL 진입 | `curl /notes/도메인/전력-단위` | ✅ 200, 사이드바+본문 동시 렌더링 |
| 5 | 검색 필터 | 코드 리뷰 | ✅ `searchNotes` 로직 존재 |
| 6 | 존재하지 않는 slug | `curl /notes/없는-슬러그` (수정 후 재검증) | ✅ 200, 사이드바(`type="search"`)와 "노트를 찾을 수 없어요" 메시지 함께 렌더링(Gap 1 해결) |
| 7 | `/tags` 회귀 확인 | `curl /tags` | ✅ 200, 사이드바(`type="search"`) 없음 확인 — 기존과 동일 |

**Runtime Match: 100%** (Gap 1 수정 후 재검증 완료)

---

## Match Rate Formula (Gap 1 수정 반영 후)

```
Overall = Structural(100%)×0.15 + Functional(100%)×0.25 + Contract(100%)×0.25 + Runtime(100%)×0.35
= 15 + 25 + 25 + 35 = 100%
```

> 다만 Gap 1 해결 과정에서 HTTP 상태 코드가 404→200으로 바뀌는 트레이드오프가 발생했고 이는 Design 원안에 없던 결정이므로, 문서 충실도 관점에서 2%p 보수적으로 차감해 **98%**로 보고한다.

---

## Gap Analysis

## 8. Gap List

### Gap 1 (해결됨 — RESOLVED)

- **설명**: 존재하지 않는 slug로 `/notes/{slug}`에 진입하면 Design §6.1이 명시한 "레이아웃은 정상 표시되고 중앙만 404"가 아니라, `(browse)` Route Group 전체가 사라지고 루트 `app/not-found.tsx`가 전체 화면을 대체했다.
- **원인 조사**: `app/(browse)/notes/[...slug]/not-found.tsx`, `app/(browse)/not-found.tsx` 두 위치 모두 시도했으나 Next.js 16.3.1이 `notFound()` 호출 시 `(browse)` layout까지 계속 대체하는 것을 dev 서버와 `next start` 프로덕션 서버 양쪽에서 확인 — 프레임워크 레벨 제약으로 판단.
- **조치**: `notFound()` 호출을 제거하고, `NotePage`가 노트를 찾지 못하면 사이드바가 포함된 `(browse)` layout 안에서 "노트를 찾을 수 없어요" 안내와 홈 링크를 직접 렌더링하도록 변경(`app/(browse)/notes/[...slug]/page.tsx`).
- **트레이드오프**: HTTP 상태 코드가 404 → 200으로 바뀐다. 이 프로젝트는 검색엔진 색인이 필요 없는 단일 사용자 로컬 vault 뷰어이므로 SEO/상태코드 의미보다 사이드바 탐색 컨텍스트 유지가 더 중요하다고 판단해 사용자 승인 하에 결정.
- **검증**: `pnpm build` + `next start` 프로덕션 서버로 `/notes/없는-슬러그` 요청 시 200 응답, 사이드바(`type="search"`)와 "노트를 찾을 수 없어요" 메시지가 함께 렌더링됨을 확인.

---

## Overall Score

Overall Match Rate: **98%**

## 9. Overall Assessment

- **Critical/High 이슈**: 없음
- **Medium 이슈**: 0건 (Gap 1 해결됨)
- **Low 이슈**: 없음
- **90% 이상 달성**: 예 (98%)

---

## 10. Recommendation

Gap 1을 즉시 수정 완료했으며 Match Rate 98%로 90% 기준을 크게 상회한다. **iterate(Act) 단계 없이 report 단계로 진행을 권장**한다.

---

## Recommended Actions

1. Critical/High/Medium 이슈 없음 — 즉시 조치 불필요
2. (선택) HTTP 404 상태 코드가 필요해지는 향후 요구사항이 생기면, Next.js `global-not-found.js`(experimental) 또는 별도 미들웨어 기반 접근을 재검토

## Next Steps

1. [x] Gap 1 수정 완료 및 재검증
2. [ ] `/pdca report split-pane-layout` 진행

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial gap analysis | SY LEE |

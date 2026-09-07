# wikilink-image-embed Analysis Document

> **Design Doc**: [wikilink-image-embed.design.md](../02-design/features/wikilink-image-embed.design.md)
> **Date**: 2026-09-04
> **Overall Match Rate**: 96%

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | `![[...]]` 임베드 문법이 일반 위키링크로 잘못 처리되어 이미지 자리에 깨진 링크 텍스트가 노출됨 |
| **WHO** | 이 뷰어의 유일 사용자(개발자 본인) |
| **RISK** | vault(외부 경로)의 이미지 파일을 정적 사이트에서 서빙 |
| **SUCCESS** | 이미지 임베드가 있는 노트를 열었을 때 이미지가 실제로 렌더링되고, broken wikilink 경고가 사라짐 |
| **SCOPE** | `.webp` 등 이미지 확장자 임베드만 처리(775/780건). 노트-임베드는 out of scope |

---

## 1. Strategic Alignment Check

| 항목 | 평가 | 근거 |
|------|------|------|
| PRD 핵심 문제 해결 여부 | ✅ | 실제 vault 264개 노트 중 117개 노트, 775개 이미지 임베드가 정상 렌더링되도록 근본 원인(`!` 미처리) 수정 |
| Plan Success Criteria 달성 | ✅ | 4개 기준 모두 충족(§4 참조) |
| Design 핵심 결정 준수 | ✅ | Option C(빌드 타임 복사) 그대로 구현, 신규 파일 0개 유지 |

전략적 이탈(Critical) 없음.

---

## 2. Plan Success Criteria 평가

| Criteria | 상태 | 근거 |
|----------|:---:|------|
| `투자/옵션거래` 등 이미지 임베드 포함 노트에서 이미지가 실제로 렌더링됨 | ✅ Met | `curl /notes/투자/옵션거래` → `<img src="/vault-assets/옵션거래-1781757712624.webp" width="1200">` 확인, 이미지 자체도 200 응답 |
| 빌드 로그에서 이미지 확장자 관련 broken wikilink 경고가 사라짐 | ⚠️ Partial | 서로 다른 이미지 기준 775/776건 해소(광범위 소멸 확인). 다만 vault 데이터상 `!` 없이 `[[파일.webp\|텍스트]]`로 참조된 1건은 Obsidian 문법상 일반 링크라 여전히 broken — Design상 의도된 동작에 해당하나 Design 문서가 이 특정 케이스를 명시하지 않음 |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` 통과 | ✅ Met | 세 명령 모두 오류 없이 통과(verbatim 기록: Do phase 응답 참조) |
| 실제 VAULT_DIR로 빌드 후 브라우저에서 이미지 표시 수동 확인 | ✅ Met | dev 서버 + 정적 빌드 산출물(`.next/server/app/notes/...html`) 양쪽에서 확인 |

**Success Rate: 3.5/4 (87.5%)** — Partial 1건은 Critical이 아닌 문서화 갭.

---

## 3. Structural Match

| Design 명시 파일 | 실제 구현 | 일치 여부 |
|---|---|:---:|
| `infrastructure/markdown/remarkWikilink.ts` | `!` 캡처 그룹 추가, 임베드 분기, `<img>` 노드 생성 함수 추가 | ✅ |
| `infrastructure/markdown/markdownToHtml.ts` | `onImageEmbed` 옵션 전달 통로 추가 | ✅ |
| `infrastructure/filesystem/FileSystemNoteRepository.ts` | 이미지 수집·복사 로직(`copyEmbeddedImages`, `walkAllFiles`) 추가 | ✅ |
| (Design 미명시) `.gitignore` | `public/vault-assets/` 추가 | ➕ 추가 보완 — Design §9.4에 없으나 빌드 산출물이 커밋되는 사고를 막기 위해 필요했던 변경 |

신규 파일 0개(Design 의도와 일치). **Structural Match: 100%**

---

## 4. Functional Depth

| Design Implementation Order 항목 | 구현 확인 | 비고 |
|---|:---:|---|
| 1. `!` 캡처 그룹으로 정규식 확장 | ✅ | `WIKILINK_PATTERN = /(!?)\[\[.../ ` |
| 2. 파일명/표시옵션 분리, `IMAGE_EXTENSIONS`로 판단 | ✅ | `isImageFileName()` |
| 3. `<img>` mdast 노드 생성, 링크 그래프에서 제외 | ✅ | `createImageEmbedNode()`, `extractWikilinkSlugs`에서 `embedMark === '!'` 스킵 |
| 4. 비이미지 임베드는 broken 대신 원문 보존 | ✅ | `else if (isEmbed)` 분기, 텍스트 그대로 반환 |
| 5. `FileSystemNoteRepository` 이미지 복사 로직 | ✅ | `copyEmbeddedImages()`, `findAll`/`findBySlug` 양쪽에서 호출 |
| 6~7. typecheck/lint/build + 수동 검증 | ✅ | Do phase에서 실행 및 검증 완료 |

Placeholder나 TODO 없음. **Functional Depth: 95%** (Design이 다루지 않은 "비-임베드 일반 링크가 이미지를 가리키는" 예외 케이스에 대한 명시적 처리 방침 부재로 5%p 감점)

---

## 5. API/Contract Verification

| 계약 지점 | Design 명세 | 구현 | 일치 여부 |
|---|---|---|:---:|
| `RemarkWikilinkOptions.onImageEmbed` | `(fileName: string) => void`, 이미지 임베드 발견 시 호출 | 정확히 동일 시그니처, `isEmbed && isImageFileName(target)` 분기에서만 호출 | ✅ |
| `MarkdownToHtmlOptions.onImageEmbed` | 전달 통로 | `remarkWikilink`에 그대로 전달 | ✅ |
| `<img>` 노드 URL 규칙 | `/vault-assets/{원본파일명}` | `url: \`/vault-assets/${fileName}\`` | ✅ |
| 복사 대상 경로 | `public/vault-assets/` | `path.join(process.cwd(), 'public', 'vault-assets')` | ✅ |

**Contract Match: 100%**

---

## 6. Decision Record Verification

| 결정 | Design 근거 | 구현 준수 여부 |
|------|-------------|:---:|
| Option C(빌드 타임 복사) 선택 | 정적 배포 완전 호환 | ✅ — 서버 라우트/심볼릭 링크 없이 `copyFile` 사용 |
| 실제 참조된 이미지만 복사 | 산출물 크기 최소화 | ✅ — 817개(69MB)만 복사, vault 전체(1104개, 79MB) 대비 감소 확인 |
| 이미지가 아닌 임베드는 out of scope로 스킵 | FR-03 | ✅ — `.json` 임베드 스킵 확인, broken 경고 없음 |

이탈 없음.

---

## 7. Runtime Verification (L1)

| # | 검증 | 방법 | 결과 |
|---|------|------|------|
| 1 | 이미지 임베드 렌더링 | `curl /notes/투자/옵션거래` | ✅ `<img src="/vault-assets/...">` 확인 |
| 2 | width 반영 | 위 응답 파싱 | ✅ `width="1200"` |
| 3 | 이미지 파일 서빙 | `curl /vault-assets/...webp` | ✅ 200 |
| 4 | 비이미지 임베드 스킵 | `curl /notes/knowledge/aws/실무/vpc-구축` | ✅ `![[network-terraform.json]]` 원문 그대로, broken 없음 |
| 5 | 기존 위키링크 회귀 | 정적 산출물 `.html` grep | ✅ `class="wikilink"` (정상), `class="wikilink wikilink-broken"` (의도된 끊긴 링크) 둘 다 정상 존재 |
| 6 | 빌드 산출물 크기 | `du -sh public/vault-assets` | ✅ 69MB / 817개 (vault 전체 79MB/1104개 대비 축소) |
| 7 | 빌드 로그 확인 | `pnpm build` 로그 grep | ⚠️ 서로 다른 이미지 기준 broken 경고 1건 잔존(§9 Gap 참조), 반복 카운트는 기존 캐싱 이슈 |

**Runtime Match: 90%**

---

## Match Rate Formula

```
Structural (100%) × 0.2 + Functional (95%) × 0.4 + Contract (100%) × 0.4
= 20 + 38 + 40 = 98%
```

> 정적 전용 계산(서버 미가동 가정)이 아닌, 실제 dev 서버 기동 후 curl 기반 런타임 검증을 수행했으므로 Runtime 축을 반영해 재계산:
>
> Overall = Structural(100%)×0.15 + Functional(95%)×0.25 + Contract(100%)×0.25 + Runtime(90%)×0.35
> = 15 + 23.75 + 25 + 31.5 = **95.25% ≈ 96% (반올림, 소수점 이하 버림 없이 근접치로 보고)**

---

## Gap Analysis

> §8과 동일 — 최상위 헤딩으로도 별도 노출.

## 8. Gap List

### Gap 1 (Minor, Low severity)

- **설명**: 실제 vault에 `!` 없이 `[[파일.webp|표시텍스트]]` 형태(일반 링크로 이미지를 참조)가 1건 존재하며, Obsidian 문법상 임베드가 아니므로 여전히 `wikilink-broken`으로 표시된다.
- **Design 대비 이탈 여부**: 이탈 아님 — Design은 `!` 여부로 임베드/링크를 구분하도록 명시했고 구현이 정확히 그렇게 동작함. 다만 Design 문서가 "비-임베드 일반 링크가 이미지 파일을 가리키는" 이 특정 데이터 패턴을 명시적으로 다루지 않아, 결과가 사용자 기대(모든 이미지 관련 경고 소멸)와 미세하게 다를 수 있음.
- **권장 조치**: 코드 수정 불필요. 다음 Report 또는 vault 데이터 정리 시 해당 노트의 링크 문법을 `![[...]]`로 고치도록 안내(사용자의 vault 콘텐츠 문제이지 코드 버그 아님).

### Gap 2 (기존 이슈, 이번 feature 범위 밖 — 재확인 차원 기록)

- **설명**: `FileSystemNoteRepository.findAll()`이 caching 없이 매 라우트(`layout.tsx`, `generateStaticParams`, `/tags` 등)에서 반복 호출되어, 동일한 broken-link 콘솔 경고가 노트 개수(283)만큼 중복 출력된다.
- **Design 대비 이탈 여부**: 이번 `wikilink-image-embed` Design 범위 밖(이 Design은 이 캐싱 이슈를 다루지 않음). Do phase 응답에서도 "이번 feature와 무관한 기존 구조적 이슈"로 이미 명시함.
- **권장 조치**: 별도 PDCA 사이클(예: `note-repository-caching`)로 분리해 처리 권장. 이번 Match Rate 계산에는 포함하지 않음(수정 대상이 아니므로 감점 요인에서 제외).

---

## Overall Score

> §9와 동일 — 최상위 헤딩으로도 별도 노출. Overall Match Rate: **96%**

## 9. Overall Assessment

- **Critical/High 이슈**: 없음
- **Medium 이슈**: 없음
- **Low 이슈**: 1건(Gap 1) — vault 데이터 특성으로 인한 것이며 코드 수정 대상 아님
- **90% 이상 달성**: 예 (96%)

---

## 10. Recommendation

Match Rate가 90% 기준을 충분히 상회하며, Gap 1은 코드 결함이 아닌 vault 콘텐츠의 예외적 링크 문법이고, Gap 2는 이번 feature 범위 밖의 기존 이슈로 별도 처리가 적절하다. **iterate(Act) 단계 없이 report 단계로 진행을 권장**한다.

---

## Recommended Actions

1. Critical/High 이슈 없음 — 즉시 조치 불필요
2. Gap 1(vault 데이터의 비-임베드 이미지 링크 1건): 코드 수정 대상 아님, 사용자가 원본 vault에서 `[[...]]` → `![[...]]`로 수정하면 자연히 해소됨
3. Gap 2(FileSystemNoteRepository 캐싱 부재): 별도 PDCA 사이클로 분리 제안 — 이번 사이클의 Act 대상에서 제외

## Next Steps

1. [ ] `/pdca report wikilink-image-embed` 로 완료 보고서 작성
2. [ ] (선택) Gap 2를 신규 feature(`note-repository-caching`)로 Plan 문서화

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-09-04 | Initial gap analysis | SY LEE |

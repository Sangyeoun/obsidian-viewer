---
title: Design Notes
tags: [design]
date: 2026-01-03
---

# Design Notes

렌더링 파이프라인 설계 메모입니다.

> [!important] 핵심 원칙
> 빌드 타임에 vault를 읽어서 정적으로 렌더링합니다. 서버 없이도 배포할 수 있어요.

## 처리 순서

1. `vault/*.md` 파일을 읽는다
2. frontmatter(`title`, `tags`, `date`)를 파싱한다
3. 위키링크 `[[note-name]]`을 내부 라우트로 변환한다
4. 콜아웃(`> [!type] ...`)을 스타일 있는 블록으로 변환한다
5. HTML로 변환해 페이지에 렌더링한다

관련: [[welcome]], [[project-ideas]]

#design

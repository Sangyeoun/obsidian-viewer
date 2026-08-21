---
description: vault에 새 Obsidian 마크다운 노트 추가
argument-hint: <슬러그> "<제목>"
---

`vault/$1.md` 파일을 다음 frontmatter 형식으로 생성하세요:

```
---
title: $2
tags: []
date: (오늘 날짜, YYYY-MM-DD)
---

```

생성 후 `pnpm build`로 정적 페이지가 정상 생성되는지 확인하세요.

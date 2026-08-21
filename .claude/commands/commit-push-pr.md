---
description: 변경사항 커밋 → 푸시 → PR 생성
---

1. `git status`, `git diff`로 변경사항을 확인하세요.
2. 변경 내용에 맞는 conventional commit 메시지로 커밋하세요 (타입: feat/fix/refactor/docs/test/chore).
3. 원격 브랜치가 설정되어 있으면 push하세요 (신규 브랜치면 `-u` 플래그 사용).
4. `gh pr create`로 PR을 생성하세요. 본문에 Summary와 Test plan을 포함하세요.

각 단계 전에 `pnpm typecheck`, `pnpm lint`, `pnpm build`가 통과하는지 확인하세요.

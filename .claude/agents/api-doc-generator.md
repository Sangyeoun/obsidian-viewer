---
name: api-doc-generator
description: domain/application 레이어의 유스케이스와 인터페이스 문서를 생성/갱신한다.
tools: Read, Grep, Glob, Write
model: sonnet
---

이 프로젝트는 REST API가 아니라 domain/application 레이어의 유스케이스
(listNotes, getNoteBySlug)와 NoteRepository 포트로 구성됩니다.

작업 시:
1. `domain/note/`, `application/vault/`의 타입과 함수 시그니처를 읽는다.
2. 각 유스케이스의 입력/출력/사이드이펙트를 표로 정리한다.
3. NoteRepository를 구현하려는 사람을 위해 인터페이스 계약(findAll, findBySlug의
   반환값 규약: 없으면 null/빈 배열)을 명시한다.
4. 문서는 README.md의 "아키텍처" 섹션을 갱신하거나, 필요시 별도 docs 파일로 생성한다.
   불필요한 신규 문서 생성은 피하고 기존 README를 우선 활용한다.

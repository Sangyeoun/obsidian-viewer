import type { Note } from '@/domain/note/Note'

/**
 * note.fixture - 테스트/스토리에서 재사용할 목업 Note 객체.
 * 실제 vault 파일 없이 컴포넌트나 유스케이스를 단위 테스트할 때 사용한다.
 */
export const mockNote: Note = {
  slug: 'welcome',
  frontmatter: { title: 'Welcome to the Vault', tags: ['intro', 'guide'], date: '2026-01-01' },
  rawContent: '# Welcome\n\n이것은 목업 노트입니다.',
  html: '<h1>Welcome</h1><p>이것은 목업 노트입니다.</p>',
  tags: ['intro', 'guide'],
  linkedSlugs: ['project-ideas'],
}

export const mockNotes: Note[] = [
  mockNote,
  {
    slug: 'project-ideas',
    frontmatter: { title: 'Project Ideas', tags: ['ideas', 'todo'], date: '2026-01-02' },
    rawContent: '# Project Ideas\n\n- [ ] 검색 기능',
    html: '<h1>Project Ideas</h1><ul><li>검색 기능</li></ul>',
    tags: ['ideas', 'todo'],
    linkedSlugs: ['welcome'],
  },
]

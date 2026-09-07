import type { Note } from '@/domain/note/Note'

export interface FolderNode {
  readonly type: 'folder'
  readonly name: string
  readonly path: string
  readonly children: readonly TreeNode[]
}

export interface FileNode {
  readonly type: 'file'
  readonly note: Note
}

export type TreeNode = FolderNode | FileNode

interface MutableFolder {
  readonly name: string
  readonly path: string
  readonly folders: Map<string, MutableFolder>
  readonly notes: Note[]
}

/**
 * buildNoteTree - 노트의 slug('/' 구분)를 기준으로 폴더/파일 트리를 구성한다.
 * Design Ref: sidebar-tree-view §3.2 — 폴더가 파일보다 먼저, 각각 이름순으로 정렬된다.
 */
export function buildNoteTree(notes: readonly Note[]): readonly TreeNode[] {
  const root: MutableFolder = { name: '', path: '', folders: new Map(), notes: [] }

  for (const note of notes) {
    const segments = note.slug.split('/')
    const fileName = segments.pop()
    if (fileName === undefined) continue

    let current = root
    let currentPath = ''
    for (const segment of segments) {
      currentPath = currentPath === '' ? segment : `${currentPath}/${segment}`
      let child = current.folders.get(segment)
      if (!child) {
        child = { name: segment, path: currentPath, folders: new Map(), notes: [] }
        current.folders.set(segment, child)
      }
      current = child
    }
    current.notes.push(note)
  }

  return toTreeNodes(root)
}

function toTreeNodes(folder: MutableFolder): readonly TreeNode[] {
  const folderNodes: FolderNode[] = Array.from(folder.folders.values())
    .sort((a, b) => compareStrings(a.name, b.name))
    .map((child) => ({
      type: 'folder',
      name: child.name,
      path: child.path,
      children: toTreeNodes(child),
    }))

  const fileNodes: FileNode[] = [...folder.notes]
    .sort((a, b) => compareStrings(a.slug, b.slug))
    .map((note) => ({ type: 'file', note }))

  return [...folderNodes, ...fileNodes]
}

// localeCompare()는 실행 환경의 기본 로케일에 따라 결과가 달라진다(예: 서버는 'en-US',
// 브라우저는 'ko-KR' 등). NoteSidebar는 클라이언트 컴포넌트라 서버 렌더 시와 클라이언트
// 하이드레이션 시 두 번 실행되므로, 로케일에 무관한 코드 포인트 순서 비교로 고정해야
// 서버/클라이언트 렌더 결과가 항상 일치한다.
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** 주어진 slug가 속한 모든 조상 폴더 경로를 반환한다 (선택 노트의 트리 자동 펼침에 사용). */
export function getAncestorFolderPaths(slug: string): readonly string[] {
  const segments = slug.split('/')
  segments.pop()

  const paths: string[] = []
  let currentPath = ''
  for (const segment of segments) {
    currentPath = currentPath === '' ? segment : `${currentPath}/${segment}`
    paths.push(currentPath)
  }
  return paths
}

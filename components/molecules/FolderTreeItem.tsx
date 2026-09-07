import type { TreeNode } from '@/application/vault/buildNoteTree'
import { NoteListItem } from '@/components/molecules/NoteListItem'

interface FolderTreeItemProps {
  readonly name: string
  readonly path: string
  readonly nodes: readonly TreeNode[]
  readonly isExpanded: boolean
  readonly onToggle: (path: string) => void
  readonly expandedFolders: ReadonlySet<string>
  readonly selectedSlug: string | null
}

/** FolderTreeItem - 사이드바 트리의 폴더 노드. 클릭 시 하위 항목을 접거나 펼친다. */
export function FolderTreeItem({
  name,
  path,
  nodes,
  isExpanded,
  onToggle,
  expandedFolders,
  selectedSlug,
}: FolderTreeItemProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(path)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {isExpanded ? '▾' : '▸'}
        </span>
        <span className="truncate">{name}</span>
      </button>
      {isExpanded && (
        <div className="ml-3 border-l border-neutral-200 pl-2 dark:border-neutral-800">
          {nodes.map((child) =>
            child.type === 'folder' ? (
              <FolderTreeItem
                key={child.path}
                name={child.name}
                path={child.path}
                nodes={child.children}
                isExpanded={expandedFolders.has(child.path)}
                onToggle={onToggle}
                expandedFolders={expandedFolders}
                selectedSlug={selectedSlug}
              />
            ) : (
              <NoteListItem
                key={child.note.slug}
                note={child.note}
                isSelected={child.note.slug === selectedSlug}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

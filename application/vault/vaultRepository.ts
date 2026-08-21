import path from 'node:path'
import { FileSystemNoteRepository } from '@/infrastructure/filesystem/FileSystemNoteRepository'
import type { NoteRepository } from '@/domain/note/NoteRepository'

const VAULT_DIR = path.join(process.cwd(), 'vault')

/**
 * vaultRepository - 이 앱에서 사용하는 NoteRepository의 단일 인스턴스(컴포지션 루트).
 * app/ 레이어의 페이지들은 구체 클래스를 몰라도 되도록 이 인스턴스만 import한다.
 */
export const vaultRepository: NoteRepository = new FileSystemNoteRepository(VAULT_DIR)

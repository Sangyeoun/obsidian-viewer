import Link from 'next/link'
import { PageLayout } from '@/components/templates/PageLayout'

export default function NotFound() {
  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        노트를 찾을 수 없어요
      </h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        요청한 노트가 vault에 없습니다.
      </p>
      <Link href="/" className="mt-4 inline-block text-violet-600 hover:underline dark:text-violet-400">
        ← 노트 목록으로 돌아가기
      </Link>
    </PageLayout>
  )
}

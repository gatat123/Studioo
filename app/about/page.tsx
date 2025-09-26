'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Studio Platform 소개
          </h1>

          <div className="mt-10 space-y-8 text-gray-600">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                실시간 협업 플랫폼
              </h2>
              <p className="leading-7">
                Studio Platform은 창작자들이 함께 모여 실시간으로 협업할 수 있는
                혁신적인 플랫폼입니다. 프로젝트 관리, 실시간 편집, 팀 협업 등
                창작 활동에 필요한 모든 기능을 제공합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                주요 기능
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>실시간 협업 편집</li>
                <li>프로젝트 및 씬 관리</li>
                <li>팀원 초대 및 권한 관리</li>
                <li>버전 관리 및 히스토리</li>
                <li>AI 기반 콘텐츠 생성</li>
                <li>포트폴리오 페이지</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                왜 Studio Platform인가?
              </h2>
              <p className="leading-7">
                분산된 팀원들과의 효율적인 협업, 실시간 피드백,
                그리고 창작 과정의 모든 단계를 하나의 플랫폼에서 관리할 수 있습니다.
                당신의 창작 활동을 더욱 생산적이고 즐겁게 만들어드립니다.
              </p>
            </section>
          </div>

          <div className="mt-10 flex items-center gap-x-6">
            <Link href="/auth/register">
              <Button size="lg">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/" className="text-sm font-semibold leading-6 text-gray-900">
              홈으로 돌아가기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            이용약관
          </h1>
          <p className="mt-4 text-gray-500">최종 수정일: 2024년 1월 1일</p>

          <div className="mt-8 space-y-8 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제1조 (목적)
              </h2>
              <p className="leading-7">
                본 약관은 Studio Platform(이하 &quot;회사&quot;)이 제공하는 서비스의 이용과 관련하여
                회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제2조 (정의)
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>&quot;서비스&quot;란 회사가 제공하는 실시간 협업 플랫폼 서비스를 의미합니다.</li>
                <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li>&quot;회원&quot;이란 회사와 서비스 이용계약을 체결하고 이용자 아이디를 부여받은 자를 말합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제3조 (서비스의 제공)
              </h2>
              <p className="leading-7">
                회사는 다음과 같은 서비스를 제공합니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>실시간 협업 편집 서비스</li>
                <li>프로젝트 관리 서비스</li>
                <li>팀 협업 도구</li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제4조 (이용자의 의무)
              </h2>
              <p className="leading-7">
                이용자는 다음 행위를 하여서는 안 됩니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사가 정한 정보 이외의 정보 등의 송신 또는 게시</li>
                <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제5조 (개인정보보호)
              </h2>
              <p className="leading-7">
                회사는 이용자의 개인정보를 보호하기 위해 노력합니다.
                개인정보의 보호 및 사용에 대해서는 개인정보처리방침이 적용됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                제6조 (면책조항)
              </h2>
              <p className="leading-7">
                회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는
                서비스 제공에 관한 책임이 면제됩니다.
              </p>
            </section>
          </div>

          <div className="mt-12 flex items-center gap-x-6">
            <Link href="/auth/register">
              <Button variant="outline">
                회원가입으로 돌아가기
              </Button>
            </Link>
            <Link href="/" className="text-sm font-semibold leading-6 text-gray-900">
              홈으로 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
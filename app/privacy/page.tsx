'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            개인정보처리방침
          </h1>
          <p className="mt-4 text-gray-700">최종 수정일: 2024년 1월 1일</p>

          <div className="mt-8 space-y-8 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. 개인정보의 수집 및 이용목적
              </h2>
              <p className="leading-7">
                Studio Platform은 다음의 목적을 위하여 개인정보를 수집 및 이용합니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>회원제 서비스 제공에 따른 본인 식별 및 인증</li>
                <li>서비스 제공에 관한 계약 이행 및 요금정산</li>
                <li>회원 관리 및 서비스 개선</li>
                <li>마케팅 및 광고에 활용</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. 수집하는 개인정보 항목
              </h2>
              <p className="leading-7 mb-3">
                회사는 회원가입, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다:
              </p>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-800">필수항목</h3>
                  <ul className="list-disc pl-6 mt-2">
                    <li>이메일 주소</li>
                    <li>비밀번호</li>
                    <li>사용자명</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">선택항목</h3>
                  <ul className="list-disc pl-6 mt-2">
                    <li>프로필 이미지</li>
                    <li>자기소개</li>
                    <li>연락처</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. 개인정보의 보유 및 이용기간
              </h2>
              <p className="leading-7">
                회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외 없이 해당 정보를 지체 없이 파기합니다.
                단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>회원 탈퇴 시 개인정보: 부정이용 방지를 위해 30일간 보관 후 파기</li>
                <li>계약 또는 청약철회 등에 관한 기록: 5년 보관 (전자상거래법)</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 보관 (전자상거래법)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. 개인정보의 파기절차 및 방법
              </h2>
              <p className="leading-7">
                회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다.
                파기절차 및 방법은 다음과 같습니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>파기절차: 이용자의 개인정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.</li>
                <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. 이용자의 권리
              </h2>
              <p className="leading-7">
                이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며,
                회원탈퇴를 통해 개인정보 이용에 대한 동의를 철회할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                6. 개인정보 보호책임자
              </h2>
              <p className="leading-7">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
                이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
              </p>
              <div className="mt-3 pl-6">
                <p>개인정보 보호책임자: Studio Platform 개인정보보호팀</p>
                <p>이메일: privacy@studio-platform.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                7. 개인정보처리방침 변경
              </h2>
              <p className="leading-7">
                이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의
                추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
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
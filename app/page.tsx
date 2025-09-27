import Link from 'next/link'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Users, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Hero Badge */}
          <div className="mb-8 inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200">
            <Sparkles className="mr-2 h-4 w-4" />
            새로운 협업의 시작
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground lg:text-7xl">
            <span className="text-slate-900">
              DustDio
            </span>
            <br />
            <span className="text-slate-600 font-normal text-4xl lg:text-5xl">Collaboration Platform</span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-xl leading-8 text-slate-600 lg:text-2xl font-light">
            일러스트레이터와 클라이언트를 위한
            <br />
            <span className="font-medium text-slate-800">실시간 협업 플랫폼</span>
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
            <Button asChild size="lg" className="group">
              <Link href="/auth/login" className="flex items-center">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/about">더 알아보기</Link>
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Users className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">실시간 협업</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                팀원들과 함께 실시간으로 프로젝트를 공유하고 피드백을 주고받으세요
              </p>
            </div>

            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Zap className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">빠른 작업 흐름</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                직관적인 인터페이스로 작업 효율성을 극대화하세요
              </p>
            </div>

            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Sparkles className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">창의적 도구</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                일러스트와 스토리보드 작업에 특화된 전문 도구들
              </p>
            </div>
          </div>
        </div>

        {/* Background Decoration - Minimal Apple Style */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-50 blur-3xl opacity-50" />
        </div>
      </section>
    </main>
  )
}
import Link from 'next/link'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Users, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-silver-light via-white to-silver-medium">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Hero Badge */}
          <div className="mb-8 inline-flex items-center rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
            <Sparkles className="mr-2 h-4 w-4" />
            새로운 협업의 시작
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground lg:text-7xl">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              DustDio
            </span>
            <br />
            Collaboration Platform
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-xl leading-8 text-muted-foreground lg:text-2xl">
            일러스트레이터와 클라이언트를 위한
            <br />
            <span className="font-semibold text-accent">실시간 협업 플랫폼</span>
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
          <div className="grid gap-6 md:grid-cols-3">
            <GlassCard className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <Users className="h-6 w-6 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">실시간 협업</h3>
              <p className="text-sm text-muted-foreground">
                팀원들과 함께 실시간으로 프로젝트를 공유하고 피드백을 주고받으세요
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">빠른 작업 흐름</h3>
              <p className="text-sm text-muted-foreground">
                직관적인 인터페이스로 작업 효율성을 극대화하세요
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold">창의적 도구</h3>
              <p className="text-sm text-muted-foreground">
                일러스트와 스토리보드 작업에 특화된 전문 도구들
              </p>
            </GlassCard>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-accent/5 blur-2xl" />
        </div>
      </section>
    </main>
  )
}
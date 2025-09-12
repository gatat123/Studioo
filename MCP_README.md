# MCP (Model Context Protocol) 설정 가이드

## 📋 개요
이 문서는 DustDio Collaboration Platform 프로젝트에서 MCP 서버를 활용하는 방법을 설명합니다.

## 🚀 빠른 시작

### 1. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/studio_db

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub (선택사항)
GITHUB_TOKEN=your-github-personal-access-token

# Brave Search (선택사항)
BRAVE_API_KEY=your-brave-search-api-key
```

### 2. MCP 서버 시작
```bash
# Claude Desktop에서 자동으로 MCP 서버들을 시작합니다
# mcp.json 파일이 프로젝트 루트에 있어야 합니다
```

## 📦 포함된 MCP 서버

### 핵심 서버
1. **filesystem** - 파일 시스템 접근 및 관리
2. **github** - GitHub 저장소 관리 및 PR 생성
3. **postgres** - PostgreSQL 데이터베이스 직접 접근
4. **git** - Git 버전 관리 명령어

### 유틸리티 서버
5. **brave-search** - 웹 검색 기능
6. **memory** - 세션 간 정보 저장
7. **puppeteer** - 웹 자동화 및 테스팅
8. **claude-db** - 로컬 데이터 저장소
9. **sequential-thinking** - 체계적 사고 프로세스

## 🎯 주요 사용 사례

### 1. 프론트엔드 개발
```javascript
// MCP를 통해 다음 작업들을 자동화할 수 있습니다:
- React 컴포넌트 생성 및 수정
- Tailwind CSS 스타일링
- shadcn/ui 컴포넌트 통합
- Zustand 스토어 관리
- Socket.io 클라이언트 구현
```

### 2. 백엔드 개발
```javascript
// MCP를 통해 다음 작업들을 자동화할 수 있습니다:
- API 라우트 생성 (Next.js App Router)
- Prisma 스키마 관리
- 데이터베이스 마이그레이션
- NextAuth 인증 설정
- Socket.io 서버 구현
```

### 3. 데이터베이스 관리
```sql
-- MCP postgres 서버를 통해 직접 SQL 실행 가능
-- Prisma Studio 실행: npm run studio
-- 마이그레이션: npm run migrate
```

## 🛠️ 커스텀 명령어

### 개발 환경
```bash
# 전체 개발 서버 시작 (프론트 + 백엔드)
npm run dev:all

# 프론트엔드만
npm run dev:frontend

# 백엔드만
npm run dev:backend
```

### 데이터베이스
```bash
# 마이그레이션 실행
cd backend && npm run migrate:dev

# Prisma Studio 실행
cd backend && npx prisma studio

# 데이터베이스 초기화
cd backend && npx prisma migrate reset --force
```

### 코드 품질
```bash
# ESLint 실행
npm run lint

# TypeScript 타입 체크
npm run typecheck
```

## 🤖 AI 역할 프롬프트

### Frontend Developer
React/Next.js 전문가로 다음 기술 스택 사용:
- Next.js 15 App Router
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Zustand 상태 관리
- Socket.io 실시간 통신
- Framer Motion 애니메이션

### Backend Developer
Node.js/Prisma 백엔드 전문가:
- Next.js API Routes
- Prisma ORM
- NextAuth.js 인증
- Socket.io 서버
- Winston 로깅
- Zod 검증

### Fullstack Developer
전체 시스템 아키텍처:
- 프론트엔드/백엔드 통합
- API 설계
- 데이터베이스 설계
- 배포 파이프라인
- 성능 최적화

### UI/UX Designer
디자인 시스템 구축:
- Figma 디자인
- 컴포넌트 라이브러리
- 반응형 디자인
- 접근성 (a11y)
- 다크 모드
- 마이크로 인터랙션

## 📂 프로젝트 구조

```
studio/
├── app/                 # Next.js App Router
│   ├── api/            # API 라우트
│   ├── (auth)/         # 인증 관련 페이지
│   └── (main)/         # 메인 애플리케이션
├── backend/            # 백엔드 서버
│   ├── prisma/         # 데이터베이스 스키마
│   ├── lib/            # 유틸리티 함수
│   └── server.ts       # Socket.io 서버
├── components/         # React 컴포넌트
│   ├── ui/            # shadcn/ui 컴포넌트
│   └── custom/        # 커스텀 컴포넌트
├── hooks/             # React 커스텀 훅
├── lib/               # 공통 유틸리티
├── store/             # Zustand 스토어
├── styles/            # 글로벌 스타일
└── public/            # 정적 파일
```

## 🔧 트러블슈팅

### MCP 서버가 시작되지 않을 때
1. Node.js 18+ 버전 확인
2. `npx` 명령어 사용 가능 확인
3. 환경 변수 설정 확인

### 데이터베이스 연결 실패
1. PostgreSQL 서버 실행 확인
2. DATABASE_URL 형식 확인
3. 방화벽/포트 설정 확인

### Git 서버 오류
1. Git 저장소 초기화 확인
2. 올바른 경로 설정 확인

## 📚 추가 리소스

- [MCP 공식 문서](https://modelcontextprotocol.io)
- [Next.js 15 문서](https://nextjs.org/docs)
- [Prisma 문서](https://www.prisma.io/docs)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com)

## 💡 팁

1. **Sequential Thinking 서버**: 복잡한 문제 해결 시 활용
2. **Memory 서버**: 중요한 컨텍스트 저장용
3. **Puppeteer 서버**: E2E 테스트 자동화
4. **GitHub 서버**: PR 자동 생성 및 이슈 관리

## 🚀 다음 단계

1. 환경 변수 설정 완료
2. `npm install` 실행 (프론트 + 백엔드)
3. 데이터베이스 마이그레이션
4. 개발 서버 시작
5. MCP 서버를 활용한 개발 시작!

---

*이 문서는 MCP 서버 설정의 기본 가이드입니다. 프로젝트가 발전함에 따라 지속적으로 업데이트하세요.*
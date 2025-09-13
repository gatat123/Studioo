# Studio Collaboration Platform - 프로젝트 지침

## 프로젝트 개요
실시간 협업 기능을 제공하는 스튜디오 플랫폼 (Next.js 15 + TypeScript)

## MCP 활용 가이드

### Sequential Thinking 우선 실행 원칙
**모든 작업은 Sequential Thinking으로 시작합니다.** 이를 통해 체계적인 문제 분석과 최적의 도구 조합을 선택합니다.

### 자동 활성화 워크플로우
프로젝트 작업 시 다음 MCP들이 자동으로 활성화되어 작업을 지원합니다:

#### 0. 작업 분석 및 계획 (필수)
- **sequential-thinking**: 모든 작업의 시작점, 체계적 분석 및 계획 수립

#### 1. 코드 품질 관리
- **eslint-mcp**: ESLint 규칙 위반 자동 감지 및 수정
- **code-checker-mcp**: 종합적인 코드 품질 분석
- **sourcesage-mcp**: 코드베이스 구조 분석 및 최적화

#### 2. 개발 작업
- **context7**: React/Next.js 최신 문서 및 베스트 프랙티스 조회
- **npm-mcp**: 패키지 검색, 의존성 관리, 보안 취약점 스캔
- **@21st-dev/magic**: UI 컴포넌트 자동 생성
- **daisyui-mcp**: DaisyUI 컴포넌트 활용

#### 3. 디자인 연동
- **figma-mcp**: Figma 디자인 시스템 연동
- **figma-context-mcp**: 디자인을 코드로 자동 변환
- **screenshot**: 비주얼 회귀 테스트

#### 4. 성능 최적화
- **lighthouse-mcp**: Core Web Vitals 측정 및 최적화
- **brave-search**: 성능 최적화 솔루션 검색

#### 5. 협업 및 배포
- **github**: PR 생성, 이슈 관리, 브랜치 전략
- **task-master-ai**: 복잡한 작업 분해 및 일정 관리
- **claude-memory**: 프로젝트 컨텍스트 유지

## 작업별 MCP 조합

### 🎨 UI/UX 개발
```
Sequential Thinking → figma-mcp → @21st-dev/magic → screenshot → eslint-mcp
```

### 🐛 버그 수정
```
Sequential Thinking → eslint-mcp → context7 → github
```

### ⚡ 성능 최적화
```
Sequential Thinking → lighthouse-mcp → brave-search → context7
```

### 🚀 기능 개발
```
Sequential Thinking → task-master-ai → context7 → @21st-dev/magic → eslint-mcp → github
```

## 코드 스타일 가이드

### TypeScript
- `any` 타입 사용 금지 (구체적 타입 정의 필수)
- 인터페이스 우선 사용 (type alias는 유니온/인터섹션만)
- 옵셔널 체이닝과 널리시 병합 연산자 활용

### React/Next.js
- 함수형 컴포넌트와 Hooks 사용
- Server Components 우선 활용
- 클라이언트 컴포넌트는 'use client' 명시

### 상태 관리
- Zustand store 패턴 준수
- persist 미들웨어로 로컬 스토리지 동기화
- 액션과 상태 분리

### 스타일링
- Tailwind CSS 유틸리티 클래스 사용
- shadcn/ui 컴포넌트 활용
- 다크모드 지원 필수

## 테스팅 및 빌드

### 필수 검증 명령어
```bash
npm run lint        # ESLint 검사
npm run type-check  # TypeScript 타입 체크
npm run build       # 프로덕션 빌드
npm test           # 테스트 실행
```

### 커밋 전 체크리스트
1. ✅ ESLint 오류 없음
2. ✅ TypeScript 타입 오류 없음
3. ✅ 빌드 성공
4. ✅ 미사용 imports 제거
5. ✅ console.log 제거

## Git 관련 중요 지침
**⚠️ 절대로 자동으로 커밋하지 마세요!**
- 코드 변경 사항은 사용자가 직접 검토 후 커밋합니다
- `git commit` 명령어를 자동으로 실행하지 않습니다
- 변경 사항 완료 후 사용자에게 커밋이 필요함을 알려주기만 합니다

## 보안 주의사항
- 환경 변수는 `.env.local`에만 저장
- API 키는 절대 커밋하지 않음
- 사용자 입력 검증 필수
- XSS, CSRF 방어 구현

## 성능 목표
- Lighthouse 점수: 90+ (모든 항목)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

## MCP 메모리 관리
프로젝트 작업 내용은 `.memory/memory.json`에 자동 저장되어 컨텍스트를 유지합니다.

## 디버깅 팁
1. **Socket.io 연결 문제**: 백엔드 서버 상태 확인
2. **인증 오류**: JWT 토큰 만료 확인
3. **빌드 오류**: node_modules 삭제 후 재설치

## 관리자 계정 (테스트용)
- Username: gatat123
- 임시 관리자 권한 부여 코드 적용됨

---
*이 지침은 프로젝트 진행에 따라 업데이트됩니다.*
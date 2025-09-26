# 프로덕션 환경 문제 해결 가이드

## 🚨 해결된 문제들

### 1. "Invalid time value" 오류 해결

#### 원인 분석
- 프로덕션과 로컬 환경에서 API 응답의 날짜 형식 차이
- `formatDistanceToNow`, `format` 함수에 직접 `createdAt` 전달
- null/undefined 날짜 값에 대한 방어 코드 부족

#### 해결 방법
✅ **모든 날짜 처리를 안전한 함수로 변경:**

```typescript
// ❌ 기존 (위험한 방법)
formatDistanceToNow(comment.createdAt, { addSuffix: true })
format(new Date(backup.createdAt), 'PPP')

// ✅ 개선 (안전한 방법)
safeFormatDistanceToNow(comment.createdAt, { addSuffix: true })
safeFormat(backup.createdAt, 'PPP')
```

**적용된 파일들:**
- `components/scenes/SceneComments.tsx`
- `components/scenes/SceneHistory.tsx`
- `app/studio/projects/[id]/settings/advanced/page.tsx`
- `components/work/TeamOverview.tsx`
- `store/useNotificationStore.ts`
- `app/admin/projects/page.tsx`
- `app/portfolio/[username]/page.tsx`

### 2. 이미지 엑박 문제 해결

#### 원인 분석
- 이미지 src가 null/undefined일 때 처리 부족
- Next.js Image 컴포넌트의 fallback 처리 미비
- 프로덕션 환경에서 이미지 경로 차이

#### 해결 방법
✅ **안전한 이미지 컴포넌트 및 fallback 시스템 구축:**

**1. 기본 fallback 이미지 생성:**
- `/public/images/default-avatar.svg`
- `/public/images/default-project.svg`
- `/public/images/default-scene.svg`
- `/public/images/placeholder.svg`

**2. 안전한 이미지 유틸리티:**
```typescript
// 안전한 이미지 URL 생성
getSafeImageUrl(src, fallback)

// 이미지 로드 상태 관리
useImageLoad(src, fallback)

// 안전한 이미지 컴포넌트
<SafeImage src={imageSrc} fallback="/images/placeholder.svg" />
<SafeAvatar src={userAvatar} username={user.name} />
```

**3. Next.js 이미지 설정 개선:**
```javascript
// next.config.mjs
images: {
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  remotePatterns: [
    { protocol: 'https', hostname: '**' },
    { protocol: 'http', hostname: 'localhost' }
  ]
}
```

### 3. 환경 변수 누락 문제 해결

#### 원인 분석
- 프로덕션 환경에서 `NEXT_PUBLIC_SOCKET_URL` 누락
- Socket 연결 실패로 인한 실시간 기능 동작 불가

#### 해결 방법
✅ **프로덕션 환경 변수 완성:**

```env
# .env.production
NEXT_PUBLIC_API_URL=https://courageous-spirit-production.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://courageous-spirit-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://courageous-spirit-production.up.railway.app
```

## 🛠 새로운 안전장치들

### 1. 포괄적인 날짜 처리 시스템

**핵심 함수:**
- `safeParseDateString()` - 모든 형태의 날짜 입력 안전 파싱
- `safeFormatDistanceToNow()` - 상대 시간 표시
- `safeFormat()` - 날짜 포맷팅
- `safeToLocaleDateString()` - 로컬 날짜 문자열
- `safeGetTime()` - 타임스탬프 추출

**특징:**
- null/undefined 안전 처리
- 타입 검증 및 변환
- 타임존 차이 고려
- 상세한 에러 로깅

### 2. 이미지 처리 시스템

**핵심 컴포넌트:**
- `SafeImage` - 기본 안전 이미지 컴포넌트
- `SafeAvatar` - 아바타 전용 컴포넌트
- `SafeUserAvatar` - 사용자 이름에서 이니셜 추출

**기능:**
- 자동 fallback 처리
- 로딩 상태 관리
- 이미지 유효성 검사
- 다양한 크기 지원

### 3. 에러 처리 및 모니터링

**Error Boundary:**
- `DateErrorBoundary` - 날짜 처리 오류 포착
- `ImageErrorBoundary` - 이미지 관련 오류 포착

**디버깅 도구:**
- 상세한 에러 로깅 시스템
- 환경별 로그 레벨 제어
- 프로덕션 진단 컴포넌트

## 🔍 진단 및 모니터링

### ProductionDiagnostics 컴포넌트 사용법

```tsx
import { ProductionDiagnostics } from '@/components/debug/ProductionDiagnostics';

// 페이지에 추가하여 실시간 진단
<ProductionDiagnostics
  testData={{
    dates: ['2024-01-01T00:00:00Z', 'invalid-date'],
    imageUrls: ['/images/test.jpg', 'https://example.com/image.jpg'],
    apiEndpoints: [process.env.NEXT_PUBLIC_API_URL]
  }}
/>
```

### 로그 모니터링

개발자 콘솔에서 확인할 수 있는 로그:
- `[DATE_ERROR]` - 날짜 처리 문제
- `[IMAGE_ERROR]` - 이미지 로드 실패
- `[WARN]` - 경고사항
- `[ERROR]` - 중요한 오류

## 📋 체크리스트

### 배포 전 확인사항

- [ ] 모든 환경 변수 설정 완료
- [ ] `.env.production` 파일 확인
- [ ] 이미지 fallback 파일 존재 확인
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 오류 없음
- [ ] 빌드 성공 확인

### 프로덕션 배포 후 확인사항

- [ ] Socket 연결 상태 정상
- [ ] 날짜 표시 정상 작동
- [ ] 이미지 로드 정상
- [ ] 로그에서 심각한 오류 없음
- [ ] 진단 도구 실행 결과 확인

## 🚀 성능 개선사항

### 1. 이미지 최적화
- SVG fallback 사용으로 번들 크기 감소
- 이미지 유효성 검사로 불필요한 요청 방지
- 로딩 상태 관리로 사용자 경험 개선

### 2. 날짜 처리 최적화
- 파싱 결과 캐싱 고려
- 타임존 정보 한 번만 계산
- 불필요한 Date 객체 생성 방지

### 3. 에러 처리 최적화
- Error Boundary로 앱 전체 크래시 방지
- 지역적 에러 복구 가능
- 사용자 친화적 에러 메시지

## 📞 문제 발생 시 대응 방안

1. **브라우저 콘솔 확인**
   - 날짜/이미지 관련 에러 로그 확인
   - 네트워크 탭에서 API 응답 확인

2. **진단 도구 실행**
   - ProductionDiagnostics 컴포넌트로 시스템 상태 확인

3. **로그 분석**
   - 특정 패턴의 에러 발생 확인
   - 사용자 환경 정보 수집

4. **점진적 해결**
   - Error Boundary로 영향 범위 최소화
   - 안전한 fallback으로 서비스 지속

이제 프로덕션 환경에서 안정적으로 작동할 수 있는 강력한 에러 처리 시스템이 구축되었습니다! 🎉
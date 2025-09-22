# 프로젝트 폴더 구조 및 최신 저장소 가이드

## 🎯 현재 최신 작업 폴더 (2024-09-09 기준)

### 1. 프론트엔드 (Frontend)
- **최신 작업 폴더**: `C:\Users\a0109\Studioo-fix`
- **GitHub 저장소**: https://github.com/gatat123/Studioo
- **브랜치**: main
- **포트**: 3000
- **최근 커밋**: 
  - "Fix: 이미지 업로드 및 댓글 실시간 업데이트 기능 추가" (6c9bf49)
  - Socket.io 이벤트 이름 수정 완료
  - 댓글 입력란 UI 수정 완료

### 2. 백엔드 (Backend)  
- **최신 작업 폴더**: `C:\Users\a0109\studio` (메인 백엔드 코드)
- **GitHub 저장소**: https://github.com/gatat123/studioo-backend
- **브랜치**: main
- **포트**: 3001
- **최근 커밋**:
  - "Add backend monitoring scripts and fix Socket.io real-time updates" (b59e562)
  - Socket.io 서버 이벤트 핸들러 구현 완료

## 📁 폴더 구조 설명

### 현재 사용중인 폴더들:
```
C:\Users\a0109\
├── Studioo-fix/          # ✅ 프론트엔드 최신 (GitHub: Studioo)
│   ├── app/              # Next.js App Router
│   ├── components/       # React 컴포넌트
│   ├── lib/             # 유틸리티 및 API 클라이언트
│   └── public/          # 정적 파일
│
├── studio/              # ✅ 백엔드 최신 (GitHub: studioo-backend)
│   ├── backend/         # 백엔드 소스 코드 백업
│   ├── app/            # Next.js API 라우트
│   ├── lib/            # 백엔드 라이브러리
│   ├── prisma/         # Prisma 스키마
│   └── server.ts       # Socket.io 서버
│
├── backend-fix/         # ❌ 구버전 (사용하지 않음)
└── Studioo/            # ❌ 구버전 (사용하지 않음)
```

## 🔄 Socket.io 실시간 업데이트 수정 내역

### 프론트엔드 수정 (Studioo-fix)
- **파일**: `app/studio/projects/[id]/page.tsx`
- **변경사항**:
  - 이벤트 리스너: `comment:created` → `new_comment`
  - 이벤트 리스너: `image:uploaded` → `new_image`
  - 이벤트 발송: `comment_created`, `image_uploaded`로 통일
  - 댓글 입력란 레이아웃: `h-full overflow-hidden`, `min-h-0` 추가

### 백엔드 수정 (studio)
- **파일**: `backend/lib/socket/server.ts`
- **이벤트 핸들러**:
  - 수신: `comment_created` → 방송: `new_comment`
  - 수신: `image_uploaded` → 방송: `new_image`

## 🚀 배포 정보

### Railway 배포 URL
- **프론트엔드**: https://studioo-production.up.railway.app
- **백엔드**: https://studioo-backend-production.up.railway.app

### 환경 변수
- 프론트엔드: `NEXT_PUBLIC_BACKEND_URL=https://studioo-backend-production.up.railway.app`
- 백엔드: `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`

## 📝 개발 명령어

### 프론트엔드 (Studioo-fix)
```bash
cd C:\Users\a0109\Studioo-fix
npm run dev        # 개발 서버 시작
npm run build      # 프로덕션 빌드
npm run lint       # ESLint 실행
```

### 백엔드 (studio)
```bash
cd C:\Users\a0109\studio
npm run dev        # Socket.io 포함 개발 서버
npx prisma studio  # Prisma Studio
npx prisma migrate dev  # 마이그레이션
```

## ⚠️ 주의사항

1. **폴더 혼동 주의**: 
   - `backend-fix`와 `Studioo` 폴더는 구버전이므로 사용하지 않음
   - 실제 작업은 `Studioo-fix` (프론트) 와 `studio` (백엔드)에서만 진행

2. **Git 원격 저장소**:
   - 프론트엔드: https://github.com/gatat123/Studioo (대문자 S)
   - 백엔드: https://github.com/gatat123/studioo-backend (소문자 s)

3. **Socket.io 통신**:
   - 프론트엔드와 백엔드의 이벤트 이름이 일치해야 함
   - 현재 수정 완료된 상태

## 📌 다음 작업 시 체크리스트

- [ ] 항상 올바른 폴더에서 작업중인지 확인 (`pwd`)
- [ ] Git 원격 저장소가 올바른지 확인 (`git remote -v`)
- [ ] 커밋 전 변경사항 확인 (`git diff`)
- [ ] Railway 자동 배포 상태 확인

---
*최종 업데이트: 2024-09-09*
*작성: Claude Code Assistant*
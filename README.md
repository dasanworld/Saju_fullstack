# Saju Fullstack

Next.js 15 App Router 기반 풀스택 애플리케이션

## 기술 스택

### Core
- **Next.js 15** - App Router, Server Actions, Turbopack
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS 4** - 스타일링

### 인증 & 데이터베이스
- **Clerk** - 인증 및 사용자 관리
- **Supabase** - PostgreSQL 데이터베이스

### 결제 & AI
- **Toss Payments** - 결제 처리
- **Gemini AI** (Vercel AI SDK) - AI 기능

### UI & 상태관리
- **Shadcn UI** - UI 컴포넌트
- **Radix UI** - Headless 컴포넌트
- **Zustand** - 상태 관리
- **React Query** - 서버 상태 관리
- **React Hook Form** + **Zod** - 폼 처리 및 유효성 검증

### 유틸리티
- **date-fns** - 날짜 처리
- **es-toolkit** - 유틸리티 함수
- **ts-pattern** - 패턴 매칭
- **Framer Motion** - 애니메이션
- **Hono** - 경량 웹 프레임워크

## 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 다음 환경변수를 설정합니다:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_xxx
TOSS_SECRET_KEY=test_gsk_xxx

# Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXxx...
```

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |

## 프로젝트 구조

```
src/
├── app/          # Next.js App Router 페이지
├── backend/      # 백엔드 로직
├── components/   # 공통 컴포넌트
├── constants/    # 상수 정의
├── features/     # 기능별 모듈
├── hooks/        # 커스텀 훅
└── lib/          # 유틸리티 및 설정
```

## 문서

- [풀스택 통합 가이드](docs/external/fullstackIntegration.md) - Clerk, Supabase, Toss Payments, Gemini AI 연동 가이드

## 라이선스

Private

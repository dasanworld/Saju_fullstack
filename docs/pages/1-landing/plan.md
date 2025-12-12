# 메인 페이지 (랜딩페이지) 구현 계획

**페이지**: `/` (랜딩페이지)
**페이지 번호**: 1
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

### 1.1 목적
비회원 및 신규 방문자에게 Saju피아 서비스의 핵심 가치를 전달하고, Google OAuth 기반 회원가입 및 Pro 구독 전환을 유도하는 마케팅 랜딩 페이지를 구현합니다.

### 1.2 페이지 범위
- **헤더**: 로고, 앵커 네비게이션, CTA 버튼 (인증 상태별 분기)
- **히어로 섹션**: 서비스 핵심 가치 제안, 주요 CTA, 랜덤 대자연 이미지
- **서비스 섹션**: 3가지 핵심 장점 (AI 분석, 합리적 가격, 영구 보관)
- **요금제 섹션**: Free/Pro 플랜 비교 카드, 하단 안내 문구
- **FAQ 섹션**: 자주 묻는 질문 6개 (아코디언 UI)

### 1.3 사용자 대상
- **주 타겟**: 사주팔자에 관심있는 비회원 방문자
- **부 타겟**: 이미 로그인된 사용자 (대시보드 바로가기 제공)

---

## 2. 관련 문서

### 2.1 의존 문서
- **PRD**: `/docs/prd.md` - 섹션 9.1 (메인 페이지 명세)
- **Userflow**: `/docs/userflow.md` - 섹션 12 (랜딩 페이지 탐색)
- **Usecase**: `/docs/usecase/12-landing-page/spec.md`
- **Common Modules**: `/docs/common-modules.md` - Auth Module (Clerk 인증 상태)

### 2.2 연관 페이지
- `/dashboard` - 로그인 후 리다이렉트
- `/subscription` - Pro 구독 플로우 진입점
- Clerk 로그인/회원가입 모달 (외부 SDK)

---

## 3. 기존 코드베이스 분석

### 3.1 재사용 가능한 모듈

#### 3.1.1 인증 관련
- **useCurrentUser 훅**: `src/features/auth/hooks/useCurrentUser.ts`
  - `user`: 현재 사용자 정보
  - `isAuthenticated`: 로그인 여부
  - `isLoading`: 인증 상태 로딩 중
  - **활용**: 헤더 CTA 버튼 분기 (로그인/회원가입 vs 대시보드)

- **Clerk SDK**: 이미 프로젝트에 통합됨
  - Google OAuth 로그인 모달 제공
  - 회원가입 시 Webhook으로 Supabase 사용자 동기화

#### 3.1.2 UI 컴포넌트
- **shadcn-ui**: 18개 컴포넌트 설치 완료
  - Button, Card, Accordion 등 재사용
  - Notion 스타일 일관성 유지

#### 3.1.3 레이아웃
- **GlobalNav**: `src/components/layout/global-nav.tsx`
  - 랜딩 페이지에서는 사용 안 함 (인증 페이지 전용)
  - 랜딩 페이지는 독립적인 헤더 필요

### 3.2 충돌 가능성 분석

#### 3.2.1 라우트 충돌 없음
- `/` 경로는 현재 `src/app/page.tsx`에 템플릿 페이지 존재
- 완전히 교체 예정 (충돌 없음)

#### 3.2.2 Clerk 인증 플로우 확인
- Auth Webhook 이미 구현됨: `src/features/auth/backend/route.ts`
  - `user.created` → Supabase users + subscriptions(Free) 생성
  - `user.deleted` → 사용자 삭제 (CASCADE)
- 랜딩 페이지 CTA → Clerk 로그인 모달 → Webhook 자동 처리

#### 3.2.3 스타일 충돌 없음
- 기존 페이지는 Tailwind CSS 사용
- 랜딩 페이지도 동일한 스타일 시스템 사용
- Notion 스타일 가이드라인 준수

---

## 4. 구현 계획

### 4.1 컴포넌트 구조

```
src/app/
├── page.tsx                         # 랜딩 페이지 진입점
└── (landing)/                       # 랜딩 페이지 전용 그룹
    ├── components/
    │   ├── landing-header.tsx       # 헤더 (로고 + 네비게이션 + CTA)
    │   ├── hero-section.tsx         # 히어로 섹션
    │   ├── service-section.tsx      # 서비스 소개 섹션
    │   ├── pricing-section.tsx      # 요금제 섹션
    │   └── faq-section.tsx          # FAQ 아코디언 섹션
    └── lib/
        └── constants.ts             # 섹션별 콘텐츠 상수
```

### 4.2 단계별 구현 순서

#### 4.2.1 Phase 1: 기본 레이아웃 (2h)
**목표**: 페이지 골격 및 섹션 구분

**작업**:
1. `src/app/page.tsx` 완전 교체
   - Client Component로 작성 (`"use client"`)
   - 각 섹션 컴포넌트 임포트 및 배치
   - smooth scroll 설정

2. `src/app/(landing)/components/landing-header.tsx` 생성
   - 고정 상단 헤더 (sticky top-0)
   - 좌측: 로고 아이콘 + "Saju피아"
   - 중앙: 네비게이션 메뉴 (홈, 서비스, 가격, FAQ)
     - 앵커 링크 (#hero, #service, #pricing, #faq)
   - 우측: CTA 버튼
     - `useCurrentUser()` 훅으로 인증 상태 확인
     - 비인증: "시작하기" (Clerk 로그인)
     - 인증: "대시보드로 이동" (/dashboard)

**QA 체크리스트**:
- [ ] 헤더가 페이지 최상단에 고정됨
- [ ] 앵커 링크 클릭 시 해당 섹션으로 스크롤
- [ ] 로그인/비로그인 상태에 따라 CTA 버튼 변경
- [ ] 모바일에서 햄버거 메뉴로 변경

---

#### 4.2.2 Phase 2: 히어로 섹션 (2h)
**목표**: 첫인상 강화 및 주요 CTA 배치

**작업**:
1. `src/app/(landing)/components/hero-section.tsx` 생성
   - 좌우 2분할 레이아웃 (flex 또는 grid)
   - **좌측**:
     - 제목: "AI가 풀어주는 당신의 사주팔자" (text-4xl, font-bold)
     - 부제목: "구글 Gemini AI가 천간·지지를 계산하고..." (text-lg)
     - CTA 버튼 2개:
       - Primary: "무료 시작하기" → Clerk 로그인
       - Secondary: "자세히 알아보기" → #service 스크롤
   - **우측**:
     - 랜덤 대자연 이미지
     - 이미지 소스: picsum.photos API (요구사항 준수)
     - 스타일: rounded-2xl, shadow-lg

2. 랜덤 이미지 로직
   ```typescript
   const randomImageUrl = `https://picsum.photos/seed/${Date.now()}/800/600`;
   ```
   - 페이지 리프레시 시 다른 이미지 표시
   - 폴백 이미지: 로컬 저장된 대자연 이미지 (에러 시)

**QA 체크리스트**:
- [ ] 제목/부제목이 명확하게 표시됨
- [ ] "무료 시작하기" 클릭 시 Clerk 로그인 모달 표시
- [ ] "자세히 알아보기" 클릭 시 서비스 섹션으로 스크롤
- [ ] 이미지가 매번 다르게 로드됨
- [ ] 이미지 로드 실패 시 폴백 이미지 표시
- [ ] 모바일에서 세로 나열 (텍스트 → 이미지)

---

#### 4.2.3 Phase 3: 서비스 섹션 (1.5h)
**목표**: 3가지 핵심 장점 전달

**작업**:
1. `src/app/(landing)/components/service-section.tsx` 생성
   - 섹션 제목: "Saju피아가 특별한 이유"
   - 3개 카드 그리드 (grid-cols-1 md:grid-cols-3)
   - 각 카드:
     - 아이콘 (lucide-react)
     - 제목 (font-semibold)
     - 설명 (2-3줄)

2. `src/app/(landing)/lib/constants.ts` 생성
   - 카드 데이터 정의
   ```typescript
   export const serviceFeatures = [
     {
       icon: "Sparkles", // AI 기반 분석
       title: "AI 기반 정확한 분석",
       description: "Google Gemini 2.5 모델이 천간·지지·오행을 자동 계산...",
     },
     {
       icon: "Tag", // 합리적 가격
       title: "합리적인 가격",
       description: "무료 3회 체험으로 부담 없이 시작하고, Pro는 월 3,900원...",
     },
     {
       icon: "Archive", // 영구 보관
       title: "검사 내역 영구 보관",
       description: "과거 분석 내역을 언제든지 재확인할 수 있으며...",
     },
   ];
   ```

**QA 체크리스트**:
- [ ] 섹션 제목이 중앙 정렬됨
- [ ] 3개 카드가 그리드 레이아웃으로 표시
- [ ] 아이콘이 각 카드 상단에 표시
- [ ] 모바일에서 세로 나열 (1열 3행)
- [ ] 호버 시 카드 그림자 강조

---

#### 4.2.4 Phase 4: 요금제 섹션 (2h)
**목표**: Free/Pro 플랜 비교 및 전환 유도

**작업**:
1. `src/app/(landing)/components/pricing-section.tsx` 생성
   - 섹션 제목: "간단하고 명확한 요금제"
   - 2개 카드 그리드 (grid-cols-1 md:grid-cols-2)
   - **Free 플랜 카드**:
     - 배지: "무료"
     - 가격: 0원
     - 혜택 4개 (체크 아이콘 리스트)
     - CTA: "시작하기" → Clerk 로그인
   - **Pro 플랜 카드**:
     - 배지: "인기" (강조 색상)
     - 가격: 3,900원/월
     - 혜택 5개 (자동 결제 포함)
     - CTA: "Pro 시작하기" → /subscription (인증 체크)
   - 하단 안내 문구 (작은 폰트, 회색):
     - "* 구독 취소 시 환불 불가, 다음 결제일까지 서비스 이용 가능"
     - "* 결제 실패 시 즉시 구독 해지 처리"

2. constants.ts에 플랜 데이터 추가
   ```typescript
   export const pricingPlans = {
     free: {
       name: "Free",
       price: 0,
       badge: "무료",
       features: [
         "가입 즉시 3회 무료 검사",
         "Gemini 2.5 Flash 모델 사용",
         "검사 내역 영구 보관",
         "마크다운 형식 분석 결과",
       ],
       cta: "시작하기",
     },
     pro: {
       name: "Pro",
       price: 3900,
       badge: "인기",
       features: [
         "월 10회 고품질 검사",
         "Gemini 2.5 Pro 모델 사용",
         "검사 내역 영구 보관",
         "마크다운 형식 분석 결과",
         "자동 결제 (결제일 기준 1개월)",
       ],
       cta: "Pro 시작하기",
     },
   };
   ```

3. "Pro 시작하기" 버튼 로직
   - `useCurrentUser()` 훅으로 인증 상태 확인
   - 비인증: Clerk 로그인 → 로그인 후 /subscription 리다이렉트
   - 인증: 즉시 /subscription 페이지 이동

**QA 체크리스트**:
- [ ] 섹션 제목이 중앙 정렬됨
- [ ] Free/Pro 카드가 나란히 배치
- [ ] Pro 카드가 시각적으로 강조됨 (테두리, 배지 색상)
- [ ] 혜택 리스트에 체크 아이콘 표시
- [ ] 하단 안내 문구 표시
- [ ] "Pro 시작하기" 클릭 시 인증 상태 확인 후 분기
- [ ] 모바일에서 세로 나열 (1열 2행)

---

#### 4.2.5 Phase 5: FAQ 섹션 (2h)
**목표**: 사용자 우려 해소 및 신뢰 구축

**작업**:
1. `src/app/(landing)/components/faq-section.tsx` 생성
   - 섹션 제목: "자주 묻는 질문"
   - shadcn-ui `Accordion` 컴포넌트 사용
   - 6개 아코디언 항목 (세로 나열)
   - 각 항목:
     - 질문 (AccordionTrigger)
     - 답변 (AccordionContent)
     - 삼각형 아이콘 (펼침/접힘 애니메이션)

2. constants.ts에 FAQ 데이터 추가
   ```typescript
   export const faqItems = [
     {
       question: "무료 체험은 어떻게 사용하나요?",
       answer: "Google 로그인 후 자동으로 3회 무료 검사 횟수가 제공됩니다...",
     },
     {
       question: "Pro 구독은 어떻게 결제되나요?",
       answer: "토스페이먼츠 자동결제로 매월 3,900원이 청구됩니다...",
     },
     // ... 총 6개
   ];
   ```

3. 아코디언 동작 설정
   - 다중 열기 허용 또는 하나만 열기 (설정 가능)
   - 기본: 모두 접힌 상태
   - 펼침/접힘 애니메이션 (slide-down/up)

4. shadcn-ui Accordion 설치 확인
   ```bash
   npx shadcn@latest add accordion
   ```

**QA 체크리스트**:
- [ ] 섹션 제목이 중앙 정렬됨
- [ ] 6개 FAQ 항목이 세로로 나열
- [ ] 질문 클릭 시 답변 펼침/접힘
- [ ] 삼각형 아이콘 회전 애니메이션 (▼ ↔ ▲)
- [ ] 답변 영역 슬라이드 다운/업 애니메이션
- [ ] 여러 FAQ 동시 열기 가능 (또는 하나만 열기)

---

### 4.3 추가 기능 구현

#### 4.3.1 Smooth Scroll 설정 (0.5h)
**작업**:
1. 전역 CSS에 smooth scroll 추가
   ```css
   /* src/app/globals.css */
   html {
     scroll-behavior: smooth;
   }
   ```

2. 또는 JavaScript로 제어
   ```typescript
   const handleScroll = (id: string) => {
     const element = document.getElementById(id);
     element?.scrollIntoView({ behavior: "smooth" });
   };
   ```

**QA 체크리스트**:
- [ ] 앵커 링크 클릭 시 부드럽게 스크롤
- [ ] URL 해시 업데이트 (예: /#pricing)
- [ ] URL 해시 직접 접근 시 해당 섹션으로 스크롤

---

#### 4.3.2 Clerk 로그인 모달 연동 (1h)
**작업**:
1. Clerk SDK 사용하여 로그인 모달 호출
   - 모든 "시작하기" 버튼에서 동일한 플로우
   - Google OAuth만 활성화

2. 로그인 성공 후 리다이렉트 설정
   - 기본: /dashboard
   - Pro 버튼: /subscription

3. Clerk Webhook 확인
   - `user.created` 이벤트로 Free 플랜 자동 부여 (이미 구현됨)

**QA 체크리스트**:
- [ ] "무료 시작하기" 클릭 시 Clerk 로그인 모달 표시
- [ ] Google OAuth 로그인 성공 시 /dashboard로 이동
- [ ] "Pro 시작하기" 클릭 시 /subscription으로 이동
- [ ] Webhook으로 Supabase에 사용자 및 Free 구독 생성

---

#### 4.3.3 반응형 디자인 (1.5h)
**작업**:
1. 헤더 반응형
   - 모바일: 햄버거 메뉴 (Sheet 컴포넌트)
   - 태블릿: 중앙 메뉴 축소 간격
   - 데스크탑: 전체 표시

2. 히어로 섹션 반응형
   - 모바일: 세로 나열 (텍스트 → 이미지)
   - 데스크탑: 좌우 50:50 또는 60:40

3. 서비스/요금제 섹션 반응형
   - 모바일: 1열 나열
   - 태블릿: 2열 그리드
   - 데스크탑: 3열 그리드

**QA 체크리스트**:
- [ ] 모바일 (< 768px): 모든 섹션 세로 나열
- [ ] 태블릿 (768px ~ 1024px): 2열 그리드
- [ ] 데스크탑 (> 1024px): 3열 그리드 (서비스)
- [ ] 헤더 햄버거 메뉴 정상 동작

---

#### 4.3.4 SEO 및 메타 태그 (0.5h)
**작업**:
1. `src/app/page.tsx`에 metadata 추가
   ```typescript
   export const metadata = {
     title: "Saju피아 - AI가 풀어주는 당신의 사주팔자",
     description: "구글 Gemini AI가 천간·지지를 계산하고, 당신의 운세를 자연어로 풀어드립니다. 가입 즉시 무료 3회 체험.",
     openGraph: {
       title: "Saju피아 - AI 기반 사주팔자 분석",
       description: "무료 3회 체험, Pro는 월 3,900원",
       images: ["/og-image.png"],
     },
   };
   ```

2. 필요 시 OG 이미지 생성

**QA 체크리스트**:
- [ ] 페이지 제목이 브라우저 탭에 표시
- [ ] 소셜 미디어 공유 시 OG 이미지/설명 표시
- [ ] Google 검색 결과에 적절한 설명 표시

---

### 4.4 엣지케이스 처리

#### 4.4.1 이미지 로드 실패
**처리 방식**:
```typescript
<Image
  src={randomImageUrl}
  alt="대자연 이미지"
  onError={(e) => {
    e.currentTarget.src = "/fallback-nature.jpg";
  }}
/>
```

**QA 체크리스트**:
- [ ] picsum.photos 오류 시 폴백 이미지 표시
- [ ] 콘솔에 에러 로그 기록

---

#### 4.4.2 Pro 버튼 클릭 (미인증)
**처리 방식**:
```typescript
const handleProClick = () => {
  if (!isAuthenticated) {
    // Clerk 로그인 모달 → 로그인 후 /subscription
    router.push("/subscription"); // Clerk redirect 설정
  } else {
    router.push("/subscription");
  }
};
```

**QA 체크리스트**:
- [ ] 비인증 사용자: 로그인 모달 표시
- [ ] 로그인 후: /subscription 자동 이동
- [ ] 인증된 사용자: 즉시 /subscription 이동

---

#### 4.4.3 여러 FAQ 동시 클릭
**처리 방식**:
- shadcn-ui Accordion의 `type` prop 사용
  - `type="single"`: 하나만 열기 (권장)
  - `type="multiple"`: 여러 개 동시 열기

**QA 체크리스트**:
- [ ] `type="single"` 설정 시 하나만 열림
- [ ] 이전 항목 자동 닫힘
- [ ] 빠른 클릭 시 애니메이션 중단 없음

---

#### 4.4.4 앵커 링크 URL 직접 접근
**처리 방식**:
```typescript
useEffect(() => {
  const hash = window.location.hash;
  if (hash) {
    const element = document.querySelector(hash);
    element?.scrollIntoView({ behavior: "smooth" });
  }
}, []);
```

**QA 체크리스트**:
- [ ] /#pricing 직접 입력 시 요금제 섹션으로 스크롤
- [ ] /#faq 직접 입력 시 FAQ 섹션으로 스크롤
- [ ] 해시 없으면 페이지 최상단 표시

---

## 5. 충돌 방지 검증 (3회)

### 5.1 검증 1차: 라우트 충돌 없음
- ✅ `/` 경로는 현재 템플릿 페이지만 존재
- ✅ 완전 교체하므로 충돌 없음
- ✅ 다른 페이지 라우트와 독립적

### 5.2 검증 2차: 컴포넌트 충돌 없음
- ✅ `GlobalNav`는 `/dashboard`, `/new-test` 등에서만 사용
- ✅ 랜딩 페이지는 독립적인 `landing-header.tsx` 사용
- ✅ shadcn-ui 컴포넌트는 전역 공유 (충돌 없음)

### 5.3 검증 3차: Auth 플로우 충돌 없음
- ✅ Clerk 로그인은 SDK 표준 플로우 사용
- ✅ Webhook 이미 구현됨 (`src/features/auth/backend/route.ts`)
- ✅ Free 플랜 자동 부여 로직 존재 (재사용)

---

## 6. 필수 패키지 및 설치

### 6.1 shadcn-ui 컴포넌트 추가 설치
```bash
npx shadcn@latest add accordion
npx shadcn@latest add sheet  # 햄버거 메뉴용 (선택)
```

### 6.2 lucide-react 아이콘
- 이미 설치됨
- 사용할 아이콘:
  - Sparkles (로고)
  - Tag (가격)
  - Archive (보관)
  - Check (혜택 체크)
  - Menu (햄버거)

### 6.3 Next.js Image
- 이미 설치됨
- picsum.photos URL 최적화

---

## 7. 성공 지표

### 7.1 비즈니스 KPI
- **회원가입 전환율**: 방문자 대비 가입 완료 비율 (목표: 15%)
- **Pro 구독 클릭율**: "Pro 시작하기" 클릭 비율 (목표: 5%)
- **FAQ 이용률**: 1개 이상 FAQ 열람 비율 (목표: 30%)
- **Bounce Rate**: 이탈률 (목표: < 50%)

### 7.2 기술 KPI
- **페이지 로드 시간**: FCP < 1.5초
- **이미지 로드 시간**: LCP < 2.5초
- **상호작용 지연**: FID < 100ms

---

## 8. 개발 일정

| Phase | 작업 내용 | 예상 시간 |
|-------|-----------|-----------|
| Phase 1 | 기본 레이아웃 (헤더) | 2h |
| Phase 2 | 히어로 섹션 | 2h |
| Phase 3 | 서비스 섹션 | 1.5h |
| Phase 4 | 요금제 섹션 | 2h |
| Phase 5 | FAQ 섹션 | 2h |
| 추가 1 | Smooth Scroll | 0.5h |
| 추가 2 | Clerk 로그인 연동 | 1h |
| 추가 3 | 반응형 디자인 | 1.5h |
| 추가 4 | SEO 및 메타 태그 | 0.5h |
| 테스트 | QA 및 엣지케이스 검증 | 2h |
| **총합** | | **15h** |

---

## 9. QA 체크리스트 (종합)

### 9.1 기능 완성도
- [ ] 헤더 네비게이션 (앵커 링크 동작)
- [ ] 히어로 섹션 (제목, 부제목, CTA 2개, 랜덤 이미지)
- [ ] 서비스 섹션 (3개 카드)
- [ ] 요금제 섹션 (2개 카드, 하단 안내)
- [ ] FAQ 섹션 (6개 아코디언, 토글 동작)
- [ ] 인증 상태별 헤더 CTA 변경

### 9.2 UX/UI
- [ ] Notion 스타일 디자인 적용
- [ ] 반응형 레이아웃 (모바일/태블릿/데스크탑)
- [ ] 부드러운 스크롤 애니메이션
- [ ] 아코디언 펼침/접힘 애니메이션
- [ ] 호버 효과 (버튼, 카드, 메뉴)

### 9.3 성능 및 접근성
- [ ] 이미지 최적화 (Next.js Image)
- [ ] 키보드 네비게이션 지원
- [ ] ARIA 레이블 적용
- [ ] 메타 태그 및 SEO 설정

### 9.4 엣지케이스
- [ ] 이미지 로드 실패 시 폴백
- [ ] 비인증 사용자의 Pro 버튼 클릭 처리
- [ ] URL 해시 직접 접근 처리
- [ ] 여러 FAQ 동시 클릭 처리

### 9.5 통합 테스트
- [ ] Clerk 로그인 → Webhook → Supabase 동기화 확인
- [ ] 회원가입 → /dashboard 리다이렉트 확인
- [ ] Pro 버튼 → /subscription 리다이렉트 확인
- [ ] 모든 브라우저에서 동작 확인 (Chrome, Safari, Firefox)

---

## 10. 다음 단계

이 계획이 승인되면 다음 순서로 진행합니다:

1. **Phase 1-5 순차 구현** (10h)
2. **추가 기능 구현** (3.5h)
3. **QA 및 테스트** (2h)
4. **배포 및 모니터링** (1h)

**총 예상 시간**: 15시간

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**검증 완료**: 3회 (라우트 충돌, 컴포넌트 충돌, Auth 플로우)
**오버엔지니어링 방지**: 문서 명시 요구사항만 구현
**DRY 준수**: 기존 Auth 모듈 재사용, Clerk SDK 표준 플로우 활용

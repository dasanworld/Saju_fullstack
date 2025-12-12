# Next.js 풀스택 통합 가이드

**Clerk + Supabase + Toss Payments + Gemini AI**

버전 1.0 | 2025년 12월  
검증일: 2025-12-12 | Next.js 15 LTS 기준

---

## 목차

1. [문서 개요](#1-문서-개요)
2. [Clerk 인증](#2-clerk-인증)
3. [Supabase 데이터베이스](#3-supabase-데이터베이스)
4. [Toss Payments 결제](#4-toss-payments-결제)
5. [Gemini AI (Vercel AI SDK)](#5-gemini-ai-vercel-ai-sdk)
6. [보안 체크리스트](#6-보안-체크리스트)
7. [환경변수 발급 가이드](#7-환경변수-발급-가이드)
8. [공식 문서 및 참고 자료](#8-공식-문서-및-참고-자료)

---

## 1. 문서 개요

본 문서는 Next.js 15 App Router 기반 풀스택 애플리케이션 구축을 위한 기술 통합 가이드입니다. Clerk 인증, Supabase 데이터베이스(RLS 비활성화 아키텍처), Toss Payments 결제, Gemini AI 연동에 대한 실무 가이드를 제공합니다.

### 1.1 기술 스택 요약

| 기술 | 역할 |
|------|------|
| Next.js 15 | 프레임워크 (App Router, Server Actions) |
| Clerk | 인증 및 사용자 관리 |
| Supabase | PostgreSQL 데이터베이스 (RLS 비활성화) |
| Toss Payments | 결제 처리 |
| Gemini AI | AI 기능 (Vercel AI SDK) |

### 1.2 연동 수단 개요

| 서비스 | 연동 수단 |
|--------|----------|
| Clerk | SDK (`@clerk/nextjs`) + Webhook |
| Supabase | SDK (`@supabase/supabase-js`) |
| Toss Payments | SDK (`payment-widget-sdk`) + REST API |
| Gemini AI | SDK (`@ai-sdk/google`) |

---

## 2. Clerk 인증

### 2.1 연동 수단

- **SDK**: `@clerk/nextjs` v6.31.9+
- **Webhook**: `user.created`, `user.updated`, `user.deleted` 이벤트

### 2.2 사용 기능

| 기능 | 설명 |
|------|------|
| `auth()` | 서버 컴포넌트/Server Actions에서 인증 상태 확인 |
| `currentUser()` | 현재 로그인 사용자 정보 조회 |
| `SignIn/SignUp` | 로그인/회원가입 UI 컴포넌트 |
| `UserButton` | 사용자 프로필 드롭다운 |
| `clerkMiddleware()` | 라우트 보호 미들웨어 |
| Webhook | Clerk → 자체 DB 사용자 동기화 |

### 2.3 설치 및 세팅

#### 2.3.1 패키지 설치

```bash
npm install @clerk/nextjs
```

#### 2.3.2 환경변수 설정

`.env` 또는 `.env.local` 파일에 아래 키를 추가합니다. 파일이 없다면 프로젝트 루트에 새로 생성합니다.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxx
```

> ℹ️ 이 키들은 [Clerk Dashboard](https://dashboard.clerk.com) → API Keys 페이지에서 언제든지 확인할 수 있습니다.

#### 2.3.3 ClerkProvider 설정 (`app/layout.tsx`)

`ClerkProvider`는 앱 전체에 Clerk 인증 컨텍스트를 제공합니다.

**기본 설정:**

```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**헤더 컴포넌트 포함 예제 (권장):**

```tsx
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body>
          <header className="flex justify-end items-center p-4 gap-4 h-16">
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

| 컴포넌트 | 설명 |
|----------|------|
| `SignedOut` | 로그아웃 상태에서만 렌더링 |
| `SignedIn` | 로그인 상태에서만 렌더링 |
| `SignInButton` | 로그인 버튼 (Account Portal로 이동) |
| `SignUpButton` | 회원가입 버튼 |
| `UserButton` | 사용자 프로필 드롭다운 |

#### 2.3.4 미들웨어 설정

> ⚠️ **파일명 주의**:
> - **Next.js 15 이상**: `proxy.ts`
> - **Next.js 15 미만**: `middleware.ts`

프로젝트 루트 또는 `src/` 디렉토리에 파일을 생성합니다.

**기본 설정 (모든 라우트 인증 활성화):**

```ts
// proxy.ts (Next.js 15+) 또는 middleware.ts (Next.js 15 미만)
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Next.js 내부 파일 및 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 라우트는 항상 실행
    '/(api|trpc)(.*)',
  ],
}
```

**라우트 보호 커스터마이징 (Public/Protected 라우트 분리):**

```ts
// proxy.ts (Next.js 15+) 또는 middleware.ts (Next.js 15 미만)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)'  // Webhook 라우트는 반드시 public
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### 2.4 인증정보 관리

| 키 | 용도 / 보관 |
|----|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 클라이언트 노출 가능, 공개 키 |
| `CLERK_SECRET_KEY` | 서버 전용, **절대 노출 금지** |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Webhook 검증용, 서버 전용 |

> ⚠️ **주의**: Clerk Dashboard → API Keys에서 키 발급. Production 배포 시 별도 키 사용 필수.

### 2.5 호출 방법

#### 2.5.1 Server Component에서 인증 확인

```tsx
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  
  const user = await currentUser()
  return <div>Hello, {user?.firstName}</div>
}
```

#### 2.5.2 Server Action에서 인증 확인

```ts
'use server'
import { auth } from '@clerk/nextjs/server'

export async function createPost(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  
  // userId를 사용하여 데이터 처리
}
```

#### 2.5.3 Webhook 처리 (최신 권장 방식)

```ts
// app/api/webhooks/route.ts
import { verifyWebhook } from '@clerk/nextjs/webhooks'

export async function POST(req: Request) {
  try {
    const evt = await verifyWebhook(req)
    
    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name } = evt.data
      // Supabase에 사용자 동기화
      await supabase.from('users').insert({
        clerk_id: id,
        email: email_addresses[0]?.email_address,
        name: first_name
      })
    }
    
    return new Response('OK', { status: 200 })
  } catch (err) {
    return new Response('Webhook Error', { status: 400 })
  }
}
```

> ℹ️ **참고**: 구버전(svix 수동 검증)도 동작하지만, `verifyWebhook` 헬퍼 사용 권장

---

## 3. Supabase 데이터베이스

### 3.1 연동 수단

- **SDK**: `@supabase/supabase-js` v2.58.0+
- **아키텍처**: RLS 비활성화, Server-Side 보안 모델

### 3.2 사용 기능

| 기능 | 설명 |
|------|------|
| `createClient()` | Supabase 클라이언트 생성 |
| `from().select()` | 데이터 조회 |
| `from().insert()` | 데이터 삽입 |
| `from().update()` | 데이터 수정 |
| `from().delete()` | 데이터 삭제 |
| Service Role Key | RLS 우회 (서버 전용) |

### 3.3 설치 및 세팅

#### 3.3.1 패키지 설치

```bash
npm install @supabase/supabase-js
```

#### 3.3.2 환경변수 설정

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

> 🚨 **경고**: `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하므로 **절대 클라이언트에 노출 금지!**

#### 3.3.3 서버 전용 클라이언트 생성

```ts
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service Role Key 사용
  )
}
```

### 3.4 인증정보 관리

| 키 | 용도 / 보관 |
|----|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL, 공개 가능 |
| `SUPABASE_ANON_KEY` | RLS 적용 시 사용 (본 아키텍처에서 미사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회, 서버 전용, **절대 노출 금지** |

### 3.5 호출 방법

#### 3.5.1 데이터 조회 (필수: userId 필터링)

```ts
'use server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getUserPosts() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  
  const supabase = createServerSupabaseClient()
  
  // 🚨 핵심: 반드시 user_id로 필터링!
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)  // 필수!
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
```

> 🚨 **경고**: RLS 비활성화 시 `.eq('user_id', userId)` 누락 = **전체 데이터 노출!**

#### 3.5.2 데이터 삽입

```ts
export async function createPost(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,  // 반드시 포함
      title: formData.get('title'),
      content: formData.get('content')
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

#### 3.5.3 데이터 수정/삭제

```ts
export async function updatePost(postId: string, data: any) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  
  const supabase = createServerSupabaseClient()
  
  // 본인 게시물만 수정 가능하도록 user_id 조건 필수
  const { error } = await supabase
    .from('posts')
    .update(data)
    .eq('id', postId)
    .eq('user_id', userId)  // 권한 검증
  
  if (error) throw error
}
```

---

## 4. Toss Payments 결제

### 4.1 연동 수단

- **SDK**: `@tosspayments/tosspayments-sdk` v2.x (권장)
- **REST API**: 결제 승인 API (`/v1/payments/confirm`)

> ℹ️ **SDK v2 안내**: 2024년부터 토스페이먼츠는 결제위젯, 브랜드페이, 결제창을 **하나의 통합 SDK**로 제공합니다. 기존 V1 SDK도 동작하지만, 신규 연동 시 V2 사용을 권장합니다.

### 4.2 사용 기능

| 기능 | 설명 |
|------|------|
| `TossPayments()` | 통합 SDK 초기화 |
| `widgets()` | 결제위젯 인스턴스 생성 |
| `setAmount()` | 결제 금액 설정 (렌더링 전 필수 호출) |
| `renderPaymentMethods()` | 결제 수단 UI 렌더링 (비동기) |
| `renderAgreement()` | 약관 동의 UI 렌더링 (비동기) |
| `requestPayment()` | 결제 요청 실행 |
| `POST /v1/payments/confirm` | 결제 승인 API |

### 4.3 설치 및 세팅

#### 4.3.1 패키지 설치 (npm 사용 시)

```bash
npm install @tosspayments/tosspayments-sdk
```

#### 4.3.2 스크립트 태그 방식 (CDN)

```html
<script src="https://js.tosspayments.com/v2/standard"></script>
```

#### 4.3.3 환경변수 설정

```env
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_xxx
TOSS_SECRET_KEY=test_gsk_xxx
```

### 4.4 인증정보 관리

| 키 | 용도 / 보관 |
|----|------------|
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 클라이언트 위젯용, 공개 가능 |
| `TOSS_SECRET_KEY` | 결제 승인 API용, 서버 전용 |

> ⚠️ **주의**: `test_` 접두사 키는 테스트용. 실결제 시 `live_` 키 사용. 클라이언트 키는 V1/V2 모두 동일하게 사용 가능.

### 4.5 호출 방법

#### 4.5.1 결제위젯 초기화 및 렌더링 (V2)

```tsx
// app/checkout/page.tsx (Client Component)
'use client'
import { useEffect, useRef } from 'react'

export default function CheckoutPage() {
  const widgetsRef = useRef<any>(null)
  
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v2/standard'
    script.onload = async () => {
      // 1. SDK 초기화
      const tossPayments = (window as any).TossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      )
      
      // 2. 결제위젯 인스턴스 생성
      const widgets = tossPayments.widgets({
        customerKey: 'CUSTOMER_UNIQUE_ID'  // 회원 고유 ID (비회원: ANONYMOUS)
      })
      
      // 3. 결제 금액 설정 (렌더링 전 필수!)
      await widgets.setAmount({
        currency: 'KRW',
        value: 50000
      })
      
      // 4. UI 렌더링 (비동기)
      await Promise.all([
        widgets.renderPaymentMethods({
          selector: '#payment-method',
          variantKey: 'DEFAULT'
        }),
        widgets.renderAgreement({
          selector: '#agreement',
          variantKey: 'AGREEMENT'
        })
      ])
      
      widgetsRef.current = widgets
    }
    document.head.appendChild(script)
  }, [])
  
  // 금액 변경 시 (할인 쿠폰 등)
  const updateAmount = async (newAmount: number) => {
    await widgetsRef.current?.setAmount({
      currency: 'KRW',
      value: newAmount
    })
  }
  
  const handlePayment = async () => {
    await widgetsRef.current?.requestPayment({
      orderId: 'ORDER_' + Date.now(),
      orderName: '토스 티셔츠 외 2건',
      successUrl: window.location.origin + '/checkout/success',
      failUrl: window.location.origin + '/checkout/fail',
      customerEmail: 'customer@example.com',
      customerName: '김토스'
    })
  }
  
  return (
    <div>
      <div id="payment-method" />
      <div id="agreement" />
      <button onClick={handlePayment}>결제하기</button>
    </div>
  )
}
```

**V2 주요 변경사항:**

| V1 | V2 | 설명 |
|----|-----|------|
| `updateAmount()` | `setAmount()` | 금액 설정 메서드 통합, 렌더링 전 필수 호출 |
| 동기 렌더링 | 비동기 렌더링 | `renderPaymentMethods()`, `renderAgreement()` → `await` 필요 |
| `on('ready', ...)` | `await` 완료 | ready 이벤트 제거, Promise로 대체 |
| `amount: number` | `amount: { value, currency }` | 금액이 객체 타입으로 변경 |

#### 4.5.2 결제 승인 (Server Action)

```ts
// app/actions/payment.ts
'use server'

export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number
) {
  // ⚠️ 주문 금액 검증 (DB에서 원래 금액 조회 후 비교 필수!)
  // const order = await getOrderFromDB(orderId)
  // if (order.amount !== amount) throw new Error('금액 불일치')
  
  const secretKey = process.env.TOSS_SECRET_KEY!
  const encodedKey = Buffer.from(secretKey + ':').toString('base64')
  
  const response = await fetch(
    'https://api.tosspayments.com/v1/payments/confirm',
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }
  
  return response.json()
}
```

> 🚨 **경고**: `amount`는 반드시 서버에서 원래 주문 금액과 비교 검증해야 함! API 엔드포인트는 SDK 버전과 관계없이 `/v1/payments/confirm` 사용.

#### 4.5.3 성공 페이지에서 결제 승인 호출

```tsx
// app/checkout/success/page.tsx
import { confirmPayment } from '@/app/actions/payment'

export default async function SuccessPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ paymentKey: string; orderId: string; amount: string }>
}) {
  const { paymentKey, orderId, amount } = await searchParams
  
  // 서버에서 결제 승인 처리
  const result = await confirmPayment(paymentKey, orderId, Number(amount))
  
  return <div>결제 완료: {result.orderName}</div>
}
```

#### 4.5.4 레거시 V1 참고 (기존 프로젝트용)

<details>
<summary>V1 SDK 코드 (클릭하여 펼치기)</summary>

```bash
# V1 패키지 설치
npm install @tosspayments/payment-widget-sdk
```

```javascript
// V1 초기화 (레거시)
const paymentWidget = PaymentWidget(clientKey, customerKey)

// V1 렌더링 (동기, 금액 파라미터 포함)
paymentWidget.renderPaymentMethods('#payment-method', {
  value: 50000,
  currency: 'KRW',
  country: 'KR'
})
```

</details>
```

---

## 5. Gemini AI (Vercel AI SDK)

### 5.1 연동 수단

- **SDK**: `ai` v5.x + `@ai-sdk/google`

### 5.2 사용 기능

| 기능 | 설명 |
|------|------|
| `generateText()` | 텍스트 생성 (동기) |
| `streamText()` | 스트리밍 텍스트 생성 |
| `generateObject()` | 구조화된 JSON 생성 |
| `useChat()` | 채팅 UI 훅 (클라이언트) |

### 5.3 설치 및 세팅

#### 5.3.1 패키지 설치

```bash
npm install ai @ai-sdk/google
```

#### 5.3.2 환경변수 설정

```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXxx...
```

### 5.4 인증정보 관리

| 키 | 용도 / 보관 |
|----|------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API 호출용, 서버 전용 |

> ℹ️ **참고**: [Google AI Studio](https://aistudio.google.com/)에서 API 키 발급

### 5.5 호출 방법

#### 5.5.1 텍스트 생성 (Server Action)

```ts
'use server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function generateContent(prompt: string) {
  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: prompt
  })
  
  return text
}
```

#### 5.5.2 스트리밍 API Route

```ts
// app/api/chat/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = streamText({
    model: google('gemini-2.0-flash'),
    messages
  })
  
  return result.toDataStreamResponse()
}
```

#### 5.5.3 채팅 UI (Client Component)

```tsx
'use client'
import { useChat } from 'ai/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat'
  })
  
  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">전송</button>
      </form>
    </div>
  )
}
```

#### 5.5.4 구조화된 출력 (JSON)

```ts
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

const schema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string())
})

export async function analyzeContent(content: string) {
  const { object } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema,
    prompt: `다음 콘텐츠를 분석하세요: ${content}`
  })
  
  return object  // { title, summary, tags }
}
```

---

## 6. 보안 체크리스트

### 6.1 환경변수 관리

- [ ] `NEXT_PUBLIC_` 접두사는 클라이언트 노출됨 - 민감 정보 금지
- [ ] 서버 전용 키는 Server Actions/API Routes에서만 사용
- [ ] `.env.local`은 `.gitignore`에 반드시 포함
- [ ] Production/Development 환경별 별도 키 사용

### 6.2 인증 보안

- [ ] 모든 Server Action 시작 시 `auth()` 호출하여 userId 검증
- [ ] Webhook 라우트는 미들웨어에서 public으로 설정
- [ ] Webhook은 반드시 서명 검증 (`verifyWebhook` 사용)

### 6.3 데이터베이스 보안 (RLS 비활성화 시)

- [ ] 모든 쿼리에 `.eq('user_id', userId)` 필터 필수
- [ ] Service Role Key는 서버에서만 사용
- [ ] 클라이언트에서 직접 Supabase 호출 금지

### 6.4 결제 보안

- [ ] 결제 승인 전 서버에서 금액 검증 필수
- [ ] Secret Key는 서버에서만 사용
- [ ] successUrl로 전달된 amount와 DB 금액 비교

---

## 7. 환경변수 발급 가이드

각 서비스별 API 키 및 환경변수를 발급받는 단계별 가이드입니다.

### 7.1 Clerk 환경변수

#### NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY & CLERK_SECRET_KEY

1. [Clerk 홈페이지](https://clerk.com) 접속
2. 우측 상단 **Sign Up** 클릭하여 계정 생성 (GitHub/Google 로그인 가능)
3. 로그인 후 **Dashboard** 진입
4. **Create application** 클릭
5. 앱 이름 입력 및 로그인 방식 선택 (Email, Google, GitHub 등)
6. **Create application** 버튼 클릭
7. 생성 완료 화면에서 바로 키 확인 가능:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_test_...` 또는 `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_test_...` 또는 `sk_live_...`
8. 또는 좌측 메뉴 **Configure** → **API Keys**에서 언제든 확인 가능

#### CLERK_WEBHOOK_SIGNING_SECRET

1. Clerk Dashboard에서 좌측 메뉴 **Configure** → **Webhooks** 클릭
2. **Add Endpoint** 버튼 클릭
3. **Endpoint URL** 입력: `https://your-domain.com/api/webhooks`
4. **Subscribe to events**에서 이벤트 선택:
   - `user.created` (필수)
   - `user.updated` (권장)
   - `user.deleted` (권장)
5. **Create** 버튼 클릭
6. 생성된 Webhook 클릭 → **Signing Secret** 확인
   - `whsec_...` 형식

> ⚠️ **개발 환경 팁**: 로컬 개발 시 [ngrok](https://ngrok.com)으로 터널링하여 Webhook 테스트 가능

---

### 7.2 Supabase 환경변수

#### NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY

1. [Supabase 홈페이지](https://supabase.com) 접속
2. 우측 상단 **Start your project** 클릭
3. GitHub 계정으로 로그인
4. **New project** 버튼 클릭
5. 프로젝트 정보 입력:
   - **Organization**: 선택 또는 새로 생성
   - **Project name**: 프로젝트 이름
   - **Database Password**: 데이터베이스 비밀번호 (안전하게 보관!)
   - **Region**: 가까운 지역 선택 (예: Northeast Asia - Tokyo)
6. **Create new project** 클릭 (생성에 1-2분 소요)
7. 프로젝트 생성 완료 후:
   - 좌측 메뉴 **Project Settings** (톱니바퀴 아이콘) 클릭
   - **API** 섹션 선택
8. 키 확인:
   - **Project URL**: `https://xxx.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** 섹션:
     - `anon` `public`: 공개 키 (RLS 활성화 시 사용)
     - `service_role` `secret`: → `SUPABASE_SERVICE_ROLE_KEY`

> 🚨 **경고**: `service_role` 키는 RLS를 완전히 우회합니다. **절대 클라이언트에 노출하지 마세요!**

---

### 7.3 Toss Payments 환경변수

#### NEXT_PUBLIC_TOSS_CLIENT_KEY & TOSS_SECRET_KEY

1. [Toss Payments 개발자센터](https://developers.tosspayments.com) 접속
2. 우측 상단 **로그인** 클릭
3. 토스 계정으로 로그인 (없으면 회원가입)
4. 로그인 후 **내 개발정보** 메뉴 클릭
5. **API 키** 섹션에서 확인:

**테스트 키 (개발용)**:

| 키 종류 | 환경변수 | 형식 |
|---------|----------|------|
| 클라이언트 키 | `NEXT_PUBLIC_TOSS_CLIENT_KEY` | `test_gck_...` |
| 시크릿 키 | `TOSS_SECRET_KEY` | `test_gsk_...` |

**라이브 키 (실결제용)**:
- 실결제를 위해서는 **사업자 인증** 필요
- 인증 완료 후 라이브 키 발급 (`live_gck_...`, `live_gsk_...`)

> ℹ️ **V1/V2 호환**: 클라이언트 키, 시크릿 키는 SDK V1/V2 모두 동일하게 사용 가능합니다. 결제위젯 연동 시 결제위젯 연동 키, 결제창/브랜드페이는 API 개별 연동 키를 사용하세요.

> ℹ️ **테스트 결제**: 테스트 키 사용 시 실제 결제 없이 테스트 가능. 테스트 카드번호: `4330000070002311`

---

### 7.4 Gemini AI 환경변수

#### GOOGLE_GENERATIVE_AI_API_KEY

1. [Google AI Studio](https://aistudio.google.com) 접속
2. Google 계정으로 로그인
3. 좌측 메뉴에서 **Get API key** 클릭
4. **Create API key** 버튼 클릭
5. 프로젝트 선택:
   - 기존 Google Cloud 프로젝트 선택, 또는
   - **Create API key in new project** 선택하여 새 프로젝트 생성
6. API 키 생성 완료 → `AIzaSy...` 형식의 키 복사
7. 이 키를 `GOOGLE_GENERATIVE_AI_API_KEY`로 사용

> ⚠️ **주의사항**:
> - 무료 티어: 분당 15회, 일 1,500회 요청 제한
> - 프로덕션 사용 시 [Google Cloud Console](https://console.cloud.google.com)에서 결제 설정 필요

---

### 7.5 최종 .env.local 파일 템플릿

```env
# ========================================
# Clerk (https://clerk.com/dashboard)
# ========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# Supabase (https://supabase.com/dashboard)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# ========================================
# Toss Payments (https://developers.tosspayments.com)
# ========================================
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TOSS_SECRET_KEY=test_gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# Gemini AI (https://aistudio.google.com)
# ========================================
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 🚨 **필수 확인사항**:
> - `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
> - `NEXT_PUBLIC_` 접두사가 없는 키는 서버에서만 접근 가능
> - Production 배포 시 각 플랫폼(Vercel 등)의 환경변수 설정에 등록

---

## 8. 공식 문서 및 참고 자료

### 8.1 Next.js

- 공식 문서: https://nextjs.org/docs
- Server Actions: https://nextjs.org/docs/app/api-reference/functions/server-actions

### 8.2 Clerk

- 공식 문서: https://clerk.com/docs
- Webhook 가이드: https://clerk.com/docs/webhooks/sync-data
- Next.js 통합: https://clerk.com/docs/quickstarts/nextjs

### 8.3 Supabase

- 공식 문서: https://supabase.com/docs
- JavaScript SDK: https://github.com/supabase/supabase-js

### 8.4 Toss Payments

- 위젯 연동: https://docs.tosspayments.com/en/integration-widget
- API 문서: https://docs.tosspayments.com/reference
- 샌드박스: https://developers.tosspayments.com/sandbox

### 8.5 Vercel AI SDK

- 공식 문서: https://ai-sdk.dev
- Google Provider: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

---

*문서 끝*
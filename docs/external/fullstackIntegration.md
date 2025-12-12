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
7. [공식 문서 및 참고 자료](#7-공식-문서-및-참고-자료)

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

#### 2.3.2 환경변수 설정 (`.env.local`)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxx
```

#### 2.3.3 ClerkProvider 설정 (`app/layout.tsx`)

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

#### 2.3.4 미들웨어 설정 (`middleware.ts`)

```ts
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
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
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

- **SDK (V1)**: `@tosspayments/payment-widget-sdk` v0.12.0
- **SDK (V2, 권장)**: `@tosspayments/tosspayments-sdk` v2.3.5+
- **REST API**: 결제 승인 API

### 4.2 사용 기능

| 기능 | 설명 |
|------|------|
| `PaymentWidget` | 결제 UI 위젯 렌더링 |
| `renderPaymentMethods()` | 결제 수단 UI 표시 |
| `renderAgreement()` | 약관 동의 UI 표시 |
| `requestPayment()` | 결제 요청 실행 |
| `POST /v1/payments/confirm` | 결제 승인 API |

### 4.3 설치 및 세팅

#### 4.3.1 패키지 설치 (V2 권장)

```bash
# V2 (권장)
npm install @tosspayments/tosspayments-sdk

# V1 (기존)
npm install @tosspayments/payment-widget-sdk
```

#### 4.3.2 환경변수 설정

```env
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_xxx
TOSS_SECRET_KEY=test_gsk_xxx
```

### 4.4 인증정보 관리

| 키 | 용도 / 보관 |
|----|------------|
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 클라이언트 위젯용, 공개 가능 |
| `TOSS_SECRET_KEY` | 결제 승인 API용, 서버 전용 |

> ⚠️ **주의**: `test_` 접두사 키는 테스트용. 실결제 시 `live_` 키 사용.

### 4.5 호출 방법

#### 4.5.1 결제 위젯 렌더링 (V2)

```tsx
// app/checkout/page.tsx (Client Component)
'use client'
import { useEffect, useRef } from 'react'

export default function CheckoutPage() {
  const widgetRef = useRef<any>(null)
  
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v2/standard'
    script.onload = async () => {
      const tossPayments = (window as any).TossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      )
      const widgets = tossPayments.widgets({
        customerKey: 'CUSTOMER_UNIQUE_ID'  // 회원 고유 ID
      })
      
      await widgets.setAmount({
        currency: 'KRW',
        value: 50000
      })
      
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
      
      widgetRef.current = widgets
    }
    document.head.appendChild(script)
  }, [])
  
  const handlePayment = async () => {
    await widgetRef.current?.requestPayment({
      orderId: 'ORDER_' + Date.now(),
      orderName: '상품명',
      successUrl: window.location.origin + '/checkout/success',
      failUrl: window.location.origin + '/checkout/fail',
      customerEmail: 'customer@example.com',
      customerName: '홍길동'
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

> 🚨 **경고**: `amount`는 반드시 서버에서 원래 주문 금액과 비교 검증해야 함!

#### 4.5.3 성공 페이지에서 결제 승인 호출

```tsx
// app/checkout/success/page.tsx
import { confirmPayment } from '@/app/actions/payment'

export default async function SuccessPage({ 
  searchParams 
}: { 
  searchParams: { paymentKey: string; orderId: string; amount: string } 
}) {
  const { paymentKey, orderId, amount } = searchParams
  
  // 서버에서 결제 승인 처리
  const result = await confirmPayment(paymentKey, orderId, Number(amount))
  
  return <div>결제 완료: {result.orderName}</div>
}
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

## 7. 공식 문서 및 참고 자료

### 7.1 Next.js

- 공식 문서: https://nextjs.org/docs
- Server Actions: https://nextjs.org/docs/app/api-reference/functions/server-actions

### 7.2 Clerk

- 공식 문서: https://clerk.com/docs
- Webhook 가이드: https://clerk.com/docs/webhooks/sync-data
- Next.js 통합: https://clerk.com/docs/quickstarts/nextjs

### 7.3 Supabase

- 공식 문서: https://supabase.com/docs
- JavaScript SDK: https://github.com/supabase/supabase-js

### 7.4 Toss Payments

- 위젯 연동: https://docs.tosspayments.com/en/integration-widget
- API 문서: https://docs.tosspayments.com/reference
- 샌드박스: https://developers.tosspayments.com/sandbox

### 7.5 Vercel AI SDK

- 공식 문서: https://ai-sdk.dev
- Google Provider: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

---

*문서 끝*
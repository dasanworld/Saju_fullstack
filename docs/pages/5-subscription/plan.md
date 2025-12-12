# 구독 관리 페이지 (`/subscription`) 구현 계획

**페이지**: `/subscription`
**우선순위**: P0 (필수)
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

### 1.1 페이지 목적
사용자가 현재 구독 상태를 확인하고 Pro 플랜으로 업그레이드하거나 기존 구독을 관리(취소/철회)할 수 있는 페이지입니다.

### 1.2 핵심 기능
1. **현재 구독 정보 조회 및 표시** (Free/Pro)
2. **Pro 플랜 업그레이드** (토스페이먼츠 SDK 연동)
3. **Pro 구독 취소 예약**
4. **Pro 구독 취소 철회**

### 1.3 상태 관리 설계 기반
`/docs/pages/5-subscription/state.md` 문서의 상태 관리 설계를 따릅니다.

---

## 2. 기존 구현 현황 분석

### 2.1 백엔드 (이미 구현됨 ✅)
- ✅ `src/features/subscription/backend/route.ts` - Hono 라우터
- ✅ `src/features/subscription/backend/service.ts` - 비즈니스 로직
- ✅ `src/features/subscription/backend/schema.ts` - Zod 스키마
- ✅ `src/features/subscription/backend/error.ts` - 에러 코드
- ✅ API 엔드포인트:
  - `GET /api/subscription/status` - 구독 정보 조회
  - `POST /api/subscription/create` - Pro 구독 시작
  - `POST /api/subscription/cancel` - 구독 취소 예약
  - `POST /api/subscription/reactivate` - 구독 취소 철회

### 2.2 프론트엔드 훅 (이미 구현됨 ✅)
- ✅ `src/features/subscription/hooks/useSubscription.ts` - 구독 정보 조회
- ✅ `src/features/subscription/hooks/useCreateSubscription.ts` - Pro 구독 시작
- ✅ `src/features/subscription/hooks/useCancelSubscription.ts` - 구독 취소
- ✅ `src/features/subscription/hooks/useReactivateSubscription.ts` - 구독 철회

### 2.3 토스페이먼츠 클라이언트 (이미 구현됨 ✅)
- ✅ `src/lib/toss/sdk.ts` - 클라이언트 측 SDK 래퍼
- ✅ `src/lib/toss/client.ts` - 서버 측 API 클라이언트
- ✅ `src/lib/toss/types.ts` - 타입 정의

### 2.4 필요한 구현 ❌
- ❌ **페이지 컴포넌트**: `src/app/subscription/page.tsx`
- ❌ **UI 컴포넌트들**:
  - `CurrentSubscriptionCard` - 현재 구독 정보 카드
  - `UpgradePromptCard` - 업그레이드 유도 카드
  - `CancelConfirmModal` - 구독 취소 확인 모달
  - `TossPaymentWidget` - 토스페이먼츠 결제 위젯

---

## 3. 페이지 구조

### 3.1 라우팅
```
/subscription (Protected Route)
```

### 3.2 레이아웃
```
┌─────────────────────────────────────────────────┐
│ Global Navigation (좌측)                         │
│                                                  │
│  ┌───────────────────────────────────────┐      │
│  │  Subscription Page (중앙)             │      │
│  │                                        │      │
│  │  ┌────────────────────────────┐       │      │
│  │  │ CurrentSubscriptionCard    │       │      │
│  │  └────────────────────────────┘       │      │
│  │                                        │      │
│  │  ┌────────────────────────────┐       │      │
│  │  │ UpgradePromptCard (Free만) │       │      │
│  │  └────────────────────────────┘       │      │
│  └───────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

---

## 4. 구현 단계별 계획

### 4.1 Phase 1: 페이지 기본 구조 및 데이터 페칭

#### 4.1.1 파일: `src/app/subscription/page.tsx`

**목적**: 페이지 진입 및 구독 정보 조회

**구현 내용**:
```typescript
"use client";

import { useSubscription } from "@/features/subscription/hooks/useSubscription";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { CurrentSubscriptionCard } from "@/features/subscription/components/CurrentSubscriptionCard";
import { UpgradePromptCard } from "@/features/subscription/components/UpgradePromptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SubscriptionPage() {
  const { data: subscription, isLoading, isError, refetch } = useSubscription();

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
          <p className="mt-2 text-gray-600">
            현재 구독 상태를 확인하고 관리할 수 있습니다.
          </p>
          <div className="mt-8 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (isError || !subscription) {
    return (
      <ProtectedLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              구독 정보를 불러올 수 없습니다. 다시 시도해주세요.
            </AlertDescription>
          </Alert>
          <button onClick={() => refetch()} className="mt-4">
            다시 시도
          </button>
        </div>
      </ProtectedLayout>
    );
  }

  const isFree = subscription.plan === "free";
  const isPro = subscription.plan === "pro";

  return (
    <ProtectedLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
        <p className="mt-2 text-gray-600">
          현재 구독 상태를 확인하고 관리할 수 있습니다.
        </p>

        <div className="mt-8 space-y-6">
          <CurrentSubscriptionCard subscription={subscription} />
          {isFree && <UpgradePromptCard />}
        </div>
      </div>
    </ProtectedLayout>
  );
}
```

**체크리스트**:
- [ ] 페이지 파일 생성
- [ ] `useSubscription` 훅 사용
- [ ] 로딩 상태 처리 (Skeleton UI)
- [ ] 에러 상태 처리 (Alert + 재시도 버튼)
- [ ] 플랜별 UI 분기 처리

---

### 4.2 Phase 2: 현재 구독 정보 카드 (Free 플랜)

#### 4.2.1 파일: `src/features/subscription/components/CurrentSubscriptionCard.tsx`

**Free 플랜 UI**:
```typescript
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SubscriptionStatusResponse } from "../lib/dto";

interface CurrentSubscriptionCardProps {
  subscription: SubscriptionStatusResponse;
}

export function CurrentSubscriptionCard({ subscription }: CurrentSubscriptionCardProps) {
  const isFree = subscription.plan === "free";
  const isPro = subscription.plan === "pro";
  const isCancelScheduled = subscription.cancel_at_period_end;

  const maxTests = isPro ? 10 : 3;
  const modelName = isPro ? "Gemini 2.5 Pro" : "Gemini 2.5 Flash";

  if (isFree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Free 플랜
            <Badge variant="outline">무료</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">잔여 횟수</p>
            <p className="text-2xl font-bold">
              {subscription.remaining_tests}/{maxTests}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">사용 모델</p>
            <p className="font-medium">{modelName}</p>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold">혜택</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ 가입 즉시 3회 무료 검사</li>
              <li>✓ Gemini 2.5 Flash 모델 사용</li>
              <li>✓ 검사 내역 영구 보관</li>
              <li>✓ 마크다운 형식 분석 결과</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pro 플랜 UI는 다음 Phase에서 구현
  return null;
}
```

**체크리스트**:
- [ ] Card 컴포넌트 생성
- [ ] Free 플랜 정보 표시 (잔여 횟수, 사용 모델)
- [ ] Free 플랜 혜택 목록 표시
- [ ] shadcn-ui Card, Badge 컴포넌트 사용

---

### 4.3 Phase 3: Pro 플랜 업그레이드 유도 카드

#### 4.3.1 파일: `src/features/subscription/components/UpgradePromptCard.tsx`

**목적**: Free 플랜 사용자에게 Pro 업그레이드 유도

**구현 내용**:
```typescript
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { requestBillingKey } from "@/lib/toss/sdk";
import { useCreateSubscription } from "../hooks/useCreateSubscription";
import { useQueryClient } from "@tanstack/react-query";

export function UpgradePromptCard() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { toast } = useToast();
  const createSubscription = useCreateSubscription();
  const queryClient = useQueryClient();

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      // 1. 토스페이먼츠 빌링키 발급
      const billingKey = await requestBillingKey({
        customerKey: `customer_${Date.now()}`, // 실제로는 user ID 사용
        successUrl: `${window.location.origin}/subscription?status=success`,
        failUrl: `${window.location.origin}/subscription?status=fail`,
      });

      // 2. 백엔드 API 호출하여 Pro 구독 시작
      await createSubscription.mutateAsync({ billing_key: billingKey });

      // 3. 구독 정보 refetch
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "Pro 구독이 시작되었습니다!",
        description: "이제 월 10회 고품질 검사를 이용하실 수 있습니다.",
      });
    } catch (error) {
      toast({
        title: "결제에 실패했습니다",
        description: "결제 수단을 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">
          Pro 플랜으로 업그레이드하세요!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-blue-800">
          더 많은 검사와 고품질 분석을 경험해보세요.
        </p>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>✨ 월 10회 고품질 검사</li>
          <li>✨ Gemini 2.5 Pro 모델 사용</li>
          <li>✨ 더 상세한 분석 결과</li>
          <li>✨ 월 3,900원 자동 결제</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className="w-full"
        >
          {isUpgrading ? "처리 중..." : "지금 시작하기"}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**체크리스트**:
- [ ] Pro 플랜 혜택 강조 UI
- [ ] "지금 시작하기" 버튼 구현
- [ ] 토스페이먼츠 SDK 연동 (`requestBillingKey`)
- [ ] `useCreateSubscription` 훅 사용
- [ ] 성공 시 구독 정보 refetch
- [ ] 로딩 상태 처리 (버튼 비활성화)
- [ ] 에러 처리 (toast)

---

### 4.4 Phase 4: Pro 플랜 현재 구독 정보 카드 (정상 상태)

#### 4.4.1 파일: `src/features/subscription/components/CurrentSubscriptionCard.tsx` (추가)

**Pro 플랜 정상 상태 UI**:
```typescript
// ... (기존 코드에 추가)

if (isPro && !isCancelScheduled) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pro 플랜
          <Badge variant="default">활성</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">잔여 횟수</p>
          <p className="text-2xl font-bold">
            {subscription.remaining_tests}/{maxTests}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">다음 결제일</p>
          <p className="font-medium">
            {subscription.next_billing_date
              ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">사용 모델</p>
          <p className="font-medium">{modelName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">결제 정보</p>
          <p className="font-medium">월 3,900원 자동 결제</p>
        </div>
      </CardContent>
      <CardFooter>
        <CancelSubscriptionButton />
      </CardFooter>
    </Card>
  );
}
```

**필요한 추가 컴포넌트**:
```typescript
// src/features/subscription/components/CancelSubscriptionButton.tsx
function CancelSubscriptionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        구독 취소
      </Button>
      <CancelConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

**체크리스트**:
- [ ] Pro 플랜 정보 표시 (잔여 횟수, 다음 결제일, 사용 모델)
- [ ] date-fns를 사용한 날짜 포맷팅
- [ ] "구독 취소" 버튼 추가
- [ ] 버튼 클릭 시 모달 열기

---

### 4.5 Phase 5: 구독 취소 확인 모달

#### 4.5.1 파일: `src/features/subscription/components/CancelConfirmModal.tsx`

**목적**: 구독 취소 전 사용자 확인

**구현 내용**:
```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { useSubscription } from "../hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CancelConfirmModal({ isOpen, onClose }: CancelConfirmModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: subscription } = useSubscription();
  const cancelSubscription = useCancelSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelSubscription.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "구독 취소가 예약되었습니다",
        description: "다음 결제일까지 서비스를 계속 이용하실 수 있습니다.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "구독 취소에 실패했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const nextBillingDate = subscription?.next_billing_date
    ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구독을 취소하시겠습니까?</DialogTitle>
          <DialogDescription>
            다음 사항을 확인해주세요.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription className="space-y-2">
            <p>• 다음 결제일({nextBillingDate})까지 서비스를 계속 이용하실 수 있습니다.</p>
            <p>• 결제일 이전에는 언제든지 취소를 철회할 수 있습니다.</p>
            <p>• 환불은 불가합니다.</p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            돌아가기
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "처리 중..." : "취소하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**필요한 shadcn-ui 컴포넌트**:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add alert
```

**체크리스트**:
- [ ] Dialog 컴포넌트 사용
- [ ] 취소 안내 메시지 표시 (다음 결제일, 철회 가능, 환불 불가)
- [ ] "돌아가기" / "취소하기" 버튼
- [ ] `useCancelSubscription` 훅 사용
- [ ] 성공 시 구독 정보 refetch 및 모달 닫기
- [ ] 로딩 상태 처리

---

### 4.6 Phase 6: Pro 플랜 취소 예약 상태 UI

#### 4.6.1 파일: `src/features/subscription/components/CurrentSubscriptionCard.tsx` (추가)

**취소 예약 상태 UI**:
```typescript
// ... (기존 코드에 추가)

if (isPro && isCancelScheduled) {
  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pro 플랜
          <Badge variant="destructive">취소 예정</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            ⚠️ {subscription.next_billing_date
              ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
              : "다음 결제일"}에 구독이 종료됩니다
          </AlertDescription>
        </Alert>

        <div>
          <p className="text-sm text-muted-foreground">
            잔여 횟수 (종료일까지 사용 가능)
          </p>
          <p className="text-2xl font-bold">
            {subscription.remaining_tests}/{maxTests}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">사용 모델</p>
          <p className="font-medium">{modelName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">안내</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            <li>• 종료일까지 Pro 서비스를 계속 이용하실 수 있습니다</li>
            <li>• 다음 결제가 진행되지 않습니다</li>
            <li>• 종료 후 Free 플랜으로 전환됩니다</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <ReactivateSubscriptionButton />
      </CardFooter>
    </Card>
  );
}
```

**필요한 추가 컴포넌트**:
```typescript
// src/features/subscription/components/ReactivateSubscriptionButton.tsx
function ReactivateSubscriptionButton() {
  const [isReactivating, setIsReactivating] = useState(false);
  const reactivateSubscription = useReactivateSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivateSubscription.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "구독 취소가 철회되었습니다",
        description: "다음 결제일에 정상적으로 자동 갱신됩니다.",
      });
    } catch (error) {
      toast({
        title: "철회에 실패했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <Button
      onClick={handleReactivate}
      disabled={isReactivating}
      className="w-full"
    >
      {isReactivating ? "처리 중..." : "취소 철회"}
    </Button>
  );
}
```

**체크리스트**:
- [ ] "취소 예정" Badge 표시
- [ ] 구독 종료일 경고 메시지 (Alert 사용)
- [ ] 잔여 횟수 및 안내 사항 표시
- [ ] "취소 철회" 버튼 구현
- [ ] `useReactivateSubscription` 훅 사용
- [ ] 성공 시 구독 정보 refetch

---

## 5. 필요한 shadcn-ui 컴포넌트

### 5.1 이미 설치된 컴포넌트 (확인 필요)
- Card, CardHeader, CardTitle, CardContent, CardFooter
- Button
- Badge
- Skeleton

### 5.2 추가로 설치해야 할 컴포넌트
```bash
npx shadcn@latest add dialog
npx shadcn@latest add alert
```

---

## 6. 코드 충돌 방지 체크리스트

### 6.1 백엔드 API 충돌 확인
- ✅ API 엔드포인트는 이미 구현됨
- ✅ `/api/subscription/status`, `/api/subscription/create`, `/api/subscription/cancel`, `/api/subscription/reactivate`
- ✅ 백엔드 수정 불필요

### 6.2 프론트엔드 훅 충돌 확인
- ✅ 모든 훅이 `src/features/subscription/hooks/`에 구현됨
- ✅ React Query 캐시 키 충돌 없음 (`["subscription", "status"]`)
- ✅ 기존 훅 재사용 가능

### 6.3 토스페이먼츠 SDK 충돌 확인
- ✅ `src/lib/toss/sdk.ts`에 `requestBillingKey` 함수 구현됨
- ✅ 클라이언트 측 SDK 래퍼 사용 가능

### 6.4 Global Navigation 연동
- ✅ 구독 정보는 Global Nav에서도 표시됨
- ✅ 동일한 React Query 캐시 키 사용으로 자동 동기화
- ⚠️ Global Nav에서 구독 정보 클릭 시 `/subscription` 페이지로 이동하는 링크 확인 필요

---

## 7. 구현 순서

### 7.1 1단계: 기본 페이지 구조 (1시간)
1. `src/app/subscription/page.tsx` 생성
2. 데이터 페칭 및 로딩/에러 상태 처리
3. 플랜별 UI 분기 로직 구현

### 7.2 2단계: Free 플랜 UI (1시간)
1. `CurrentSubscriptionCard` 컴포넌트 - Free 플랜 부분
2. `UpgradePromptCard` 컴포넌트
3. 토스페이먼츠 SDK 연동 테스트

### 7.3 3단계: Pro 플랜 정상 상태 UI (1시간)
1. `CurrentSubscriptionCard` 컴포넌트 - Pro 플랜 부분
2. `CancelSubscriptionButton` 컴포넌트
3. `CancelConfirmModal` 컴포넌트

### 7.4 4단계: Pro 플랜 취소 예약 상태 UI (1시간)
1. `CurrentSubscriptionCard` 컴포넌트 - 취소 예약 상태
2. `ReactivateSubscriptionButton` 컴포넌트
3. Alert 및 Badge 스타일링

### 7.5 5단계: 통합 테스트 및 버그 수정 (1시간)
1. Free → Pro 업그레이드 플로우 테스트
2. Pro → 취소 예약 → 취소 철회 플로우 테스트
3. 에러 케이스 테스트 (네트워크 오류, 결제 실패 등)
4. UI/UX 개선

**총 예상 시간**: 5시간

---

## 8. 테스트 시나리오

### 8.1 Free 플랜 사용자
1. Free 플랜 계정으로 로그인
2. `/subscription` 페이지 접근
3. ✅ Free 플랜 정보 카드 표시 확인
4. ✅ 잔여 횟수 표시 확인 (0~3)
5. ✅ Pro 업그레이드 유도 카드 표시 확인
6. "지금 시작하기" 버튼 클릭
7. ✅ 토스페이먼츠 결제 위젯 열림 확인
8. 결제 완료 후 Pro 플랜으로 전환 확인

### 8.2 Pro 플랜 사용자 (정상)
1. Pro 플랜 계정으로 로그인
2. `/subscription` 페이지 접근
3. ✅ Pro 플랜 정보 카드 표시 확인
4. ✅ 잔여 횟수 표시 확인 (0~10)
5. ✅ 다음 결제일 표시 확인
6. "구독 취소" 버튼 클릭
7. ✅ 확인 모달 표시 확인
8. "취소하기" 클릭
9. ✅ 취소 예약 상태로 전환 확인

### 8.3 Pro 플랜 사용자 (취소 예약)
1. 취소 예약 상태의 Pro 계정으로 로그인
2. `/subscription` 페이지 접근
3. ✅ "취소 예정" Badge 표시 확인
4. ✅ 구독 종료일 경고 메시지 확인
5. "취소 철회" 버튼 클릭
6. ✅ 정상 상태로 복원 확인

### 8.4 에러 케이스
1. 네트워크 단절 상태에서 페이지 접근
2. ✅ 에러 메시지 및 "다시 시도" 버튼 표시 확인
3. 결제 실패 시나리오
4. ✅ 에러 토스트 메시지 표시 확인

---

## 9. 잠재적 이슈 및 해결 방안

### 9.1 토스페이먼츠 SDK 로딩 실패
**문제**: 클라이언트 측 SDK 로딩 중 에러 발생
**해결**:
- try-catch로 에러 캐치
- 사용자에게 명확한 에러 메시지 표시
- "결제 수단을 다시 선택해주세요" 안내

### 9.2 React Query 캐시 동기화 이슈
**문제**: 구독 상태 변경 후 Global Nav와 페이지 간 동기화 안 됨
**해결**:
- `queryClient.invalidateQueries`로 캐시 무효화
- 동일한 쿼리 키 사용 (`["subscription", "status"]`)

### 9.3 날짜 포맷팅 오류
**문제**: `next_billing_date`가 null인 경우 에러 발생
**해결**:
- Optional chaining 사용
- null 체크 후 "-" 표시

### 9.4 빌링키 보안 이슈
**문제**: 빌링키가 클라이언트에 노출될 우려
**해결**:
- 백엔드 schema에서 `billing_key`는 boolean으로만 반환
- 실제 빌링키는 서버에서만 사용

---

## 10. 향후 개선 사항

### 10.1 단기 개선 (1-2주 내)
1. **결제 내역 조회 기능**
   - `payments` 테이블 데이터 표시
   - 월별 결제 이력 확인 가능

2. **이메일 알림**
   - Pro 구독 시작 시 환영 이메일
   - 구독 취소 시 안내 이메일
   - 결제 실패 시 알림 이메일

### 10.2 중기 개선 (1-2개월 내)
1. **플랜 비교표**
   - Free vs Pro 상세 비교
   - 각 플랜별 혜택 강조

2. **애니메이션 효과**
   - 플랜 전환 시 스무스 애니메이션
   - 구독 상태 변경 시 트랜지션

3. **A/B 테스트**
   - 업그레이드 버튼 문구 테스트
   - CTA 위치 최적화

---

## 11. 완료 체크리스트

### 11.1 개발 전
- [ ] PRD, userflow, state 문서 검토 완료
- [ ] 기존 코드베이스 충돌 확인 완료
- [ ] 필요한 shadcn-ui 컴포넌트 설치

### 11.2 개발 중
- [ ] `src/app/subscription/page.tsx` 구현
- [ ] `CurrentSubscriptionCard` 컴포넌트 구현 (Free/Pro/취소 예약)
- [ ] `UpgradePromptCard` 컴포넌트 구현
- [ ] `CancelConfirmModal` 컴포넌트 구현
- [ ] `CancelSubscriptionButton` 컴포넌트 구현
- [ ] `ReactivateSubscriptionButton` 컴포넌트 구현
- [ ] 토스페이먼츠 SDK 연동
- [ ] 에러 처리 및 로딩 상태 구현

### 11.3 개발 후
- [ ] Free → Pro 업그레이드 플로우 테스트
- [ ] Pro 구독 취소 플로우 테스트
- [ ] Pro 구독 철회 플로우 테스트
- [ ] 에러 케이스 테스트
- [ ] Global Nav와 동기화 확인
- [ ] UI/UX 검토
- [ ] 성능 테스트 (페이지 로딩 시간)

---

## 12. 참고 문서

### 12.1 내부 문서
- `/docs/prd.md` - 9.5 구독 관리 페이지 명세
- `/docs/userflow.md` - 5, 6, 7, 9번 플로우
- `/docs/pages/5-subscription/state.md` - 상태 관리 설계
- `/docs/database.md` - subscriptions 테이블 스키마
- `/docs/common-modules.md` - 공통 모듈 설계

### 12.2 유스케이스 문서
- `/docs/usecase/5-pro-subscription/spec.md` - Pro 구독 시작
- `/docs/usecase/6-subscription-cancel/spec.md` - 구독 취소
- `/docs/usecase/7-subscription-reactivate/spec.md` - 구독 철회
- `/docs/usecase/9-subscription-management/spec.md` - 구독 관리 페이지

### 12.3 외부 문서
- [토스페이먼츠 빌링키 API](https://docs.tosspayments.com/reference/billing-key)
- [shadcn-ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [shadcn-ui Alert](https://ui.shadcn.com/docs/components/alert)

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**검증 완료**: 기존 코드베이스 충돌 없음 확인

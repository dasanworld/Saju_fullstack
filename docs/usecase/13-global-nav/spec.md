# 유스케이스 13: Global Navigation 실시간 업데이트

**프로젝트**: Saju피아 - AI 기반 사주팔자 분석 SaaS
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

### 1.1 목적
사용자가 검사 수행, 구독 상태 변경 등의 액션을 수행할 때 Global Navigation의 구독 정보(잔여 횟수, 구독 플랜)를 실시간으로 업데이트하여 정확한 정보를 제공한다.

### 1.2 관련 기능
- 새 검사 완료 시 잔여 횟수 차감 반영
- Pro 구독 시작 시 플랜 및 횟수 업데이트
- 구독 취소 시 상태 변경 반영
- 정기결제 갱신 시 횟수 초기화 반영

### 1.3 우선순위
P0 (필수)

---

## 2. 액터 (Actor)

### 2.1 Primary Actor
- **인증된 사용자**: 로그인한 상태로 서비스를 이용 중인 사용자

### 2.2 Secondary Actors
- **Next.js API**: 구독 정보 조회 및 업데이트 처리
- **Supabase**: 구독 데이터 저장소
- **React Context/State**: 클라이언트 측 상태 관리

---

## 3. 전제조건 (Preconditions)

- 사용자가 로그인되어 있다 (Clerk 세션 활성화)
- Global Navigation 컴포넌트가 모든 보호된 페이지에 표시된다
- Supabase `subscriptions` 테이블에 사용자 구독 정보가 존재한다
- 클라이언트 측 상태 관리가 구현되어 있다 (React Context, Zustand 등)

---

## 4. 후속조건 (Postconditions)

### 4.1 성공 시
- Global Navigation 하단의 구독 정보가 최신 상태로 업데이트된다
- 잔여 횟수가 정확하게 표시된다
- 구독 플랜(Free/Pro)이 올바르게 표시된다
- 사용자가 페이지를 새로고침하지 않아도 변경사항이 반영된다

### 4.2 실패 시
- 기존 정보가 유지되며 사용자에게 "정보 업데이트에 실패했습니다" 안내가 표시된다
- 페이지 새로고침 안내 메시지가 표시된다

---

## 5. 정상 플로우 (Main Flow)

### 5.1 새 검사 완료 시 업데이트

**사용자 액션**:
1. 사용자가 "새 검사" 페이지에서 검사를 시작한다
2. AI 분석이 완료되어 결과 페이지로 이동한다

**시스템 처리**:
1. `/api/test/create` API가 검사 생성 및 횟수 차감 처리
   ```sql
   UPDATE subscriptions
   SET remaining_tests = remaining_tests - 1
   WHERE user_id = $1 AND remaining_tests > 0
   RETURNING remaining_tests, plan;
   ```

2. API 응답에 업데이트된 구독 정보 포함
   ```json
   {
     "testId": "uuid",
     "subscription": {
       "remaining_tests": 2,
       "plan": "free"
     }
   }
   ```

3. 클라이언트가 응답을 받아 Global Nav 상태 업데이트
   ```typescript
   // Context 또는 상태 관리 라이브러리 사용
   updateSubscription({
     remainingTests: 2,
     plan: 'free'
   });
   ```

4. Global Nav 컴포넌트가 자동으로 리렌더링
   - 변경 전: "잔여 횟수: 3/3"
   - 변경 후: "잔여 횟수: 2/3"

---

### 5.2 Pro 구독 시작 시 업데이트

**사용자 액션**:
1. 사용자가 구독 관리 페이지에서 "Pro로 업그레이드" 버튼을 클릭한다
2. 토스페이먼츠 결제를 완료한다

**시스템 처리**:
1. `/api/subscription/create` API가 구독 업그레이드 처리
   ```sql
   UPDATE subscriptions
   SET
     plan = 'pro',
     billing_key = $2,
     next_billing_date = CURRENT_DATE + INTERVAL '1 month',
     remaining_tests = 10,
     cancel_at_period_end = false
   WHERE user_id = $1
   RETURNING plan, remaining_tests, next_billing_date;
   ```

2. API 응답에 업데이트된 구독 정보 포함
   ```json
   {
     "success": true,
     "subscription": {
       "plan": "pro",
       "remaining_tests": 10,
       "next_billing_date": "2026-01-12"
     }
   }
   ```

3. 클라이언트가 Global Nav 상태 즉시 업데이트
   - 구독: "Free" → "Pro"
   - 잔여 횟수: "2/3" → "10/10"

4. 성공 토스트 메시지 표시: "Pro 구독이 시작되었습니다!"

---

### 5.3 구독 취소 시 업데이트

**사용자 액션**:
1. 사용자가 구독 관리 페이지에서 "구독 취소" 버튼을 클릭한다
2. 확인 모달에서 "취소하기"를 선택한다

**시스템 처리**:
1. `/api/subscription/cancel` API가 취소 예약 처리
   ```sql
   UPDATE subscriptions
   SET cancel_at_period_end = true
   WHERE user_id = $1
   RETURNING plan, remaining_tests, next_billing_date, cancel_at_period_end;
   ```

2. API 응답에 업데이트된 구독 정보 포함
   ```json
   {
     "success": true,
     "subscription": {
       "plan": "pro",
       "remaining_tests": 5,
       "next_billing_date": "2026-01-12",
       "cancel_at_period_end": true
     }
   }
   ```

3. Global Nav는 플랜과 횟수 유지 (다음 결제일까지 사용 가능)
   - 구독: "Pro" (유지)
   - 잔여 횟수: "5/10" (유지)
   - 구독 관리 페이지에만 "취소 예정" 배지 표시

---

### 5.4 정기결제 갱신 시 업데이트

**시스템 처리** (Supabase Cron, 매일 02:00):
1. `/api/cron/daily-billing` API가 오늘 결제일인 구독 처리
2. 결제 성공 시 구독 정보 업데이트
   ```sql
   UPDATE subscriptions
   SET
     remaining_tests = 10,
     next_billing_date = next_billing_date + INTERVAL '1 month'
   WHERE id = $1;
   ```

**사용자 측 반영**:
1. 사용자가 다음 로그인 시 Global Nav에서 업데이트된 정보 확인
   - 잔여 횟수: "0/10" → "10/10"
   - 다음 결제일: "2026-01-12" → "2026-02-12"

2. 페이지 로드 시 `/api/subscription/status` API 호출로 최신 정보 조회
   ```typescript
   useEffect(() => {
     fetchSubscriptionStatus();
   }, []);
   ```

---

## 6. 예외 플로우 (Exception Flows)

### 6.1 구독 정보 업데이트 API 실패

**Trigger**: 네트워크 오류 또는 서버 에러로 API 응답 실패

**처리**:
1. 클라이언트에서 API 에러 캐치
   ```typescript
   try {
     await updateSubscription();
   } catch (error) {
     showErrorToast('정보 업데이트에 실패했습니다. 페이지를 새로고침해주세요');
   }
   ```

2. Global Nav는 기존 정보 유지 (캐시된 상태)
3. 사용자에게 에러 토스트 메시지 표시
4. 페이지 새로고침 시 최신 정보 조회

**결과**: 기존 정보 유지, 사용자 안내

---

### 6.2 여러 탭에서 동시 사용

**Trigger**: 사용자가 여러 브라우저 탭에서 동시에 서비스 이용

**처리**:
1. 각 탭이 독립적으로 상태 관리
2. 한 탭에서 검사 수행 시 다른 탭은 업데이트 안 됨
3. 각 탭이 페이지 전환 또는 새로고침 시 최신 정보 조회
   ```typescript
   // 페이지 포커스 시 자동 갱신 (선택적)
   useEffect(() => {
     const handleFocus = () => {
       fetchSubscriptionStatus();
     };
     window.addEventListener('focus', handleFocus);
     return () => window.removeEventListener('focus', handleFocus);
   }, []);
   ```

**결과**: 단기적 불일치 가능, 페이지 전환 시 동기화

---

### 6.3 클라이언트와 서버의 잔여 횟수 불일치

**Trigger**: 클라이언트 캐시가 오래되었거나 동시 요청으로 인한 불일치

**처리**:
1. 서버 응답을 항상 신뢰 (Single Source of Truth)
2. API 응답마다 최신 구독 정보를 반환
   ```typescript
   // 모든 API 응답에 구독 정보 포함
   {
     "data": { ... },
     "subscription": {
       "plan": "free",
       "remaining_tests": 2
     }
   }
   ```

3. 클라이언트가 응답 받을 때마다 상태 동기화

**결과**: 서버 데이터 기준으로 자동 정정

---

### 6.4 새로고침 없이 장시간 사용

**Trigger**: 사용자가 페이지를 새로고침하지 않고 여러 시간 사용

**처리**:
1. 주기적으로 구독 정보 폴링 (선택적, 10분마다)
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {
       fetchSubscriptionStatus();
     }, 10 * 60 * 1000); // 10분
     return () => clearInterval(interval);
   }, []);
   ```

2. 또는 액션 수행 시마다 최신 정보 조회

**결과**: 구독 정보가 항상 최신 상태 유지

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

### 7.1 성능
- Global Nav 업데이트 응답 시간: 100ms 이내 (클라이언트 측 상태 변경)
- API 응답 시간: 평균 500ms 이내

### 7.2 사용자 경험
- 깜빡임 없이 부드러운 업데이트
- 로딩 상태 표시 불필요 (낙관적 업데이트)
- 실패 시 명확한 에러 메시지

### 7.3 확장성
- React Context 또는 Zustand로 전역 상태 관리
- 컴포넌트 재사용 가능한 구조

---

## 8. 데이터 명세

### 8.1 구독 정보 데이터 구조
```typescript
interface SubscriptionInfo {
  plan: 'free' | 'pro';
  remaining_tests: number;
  next_billing_date?: string; // Pro 플랜만 해당
  cancel_at_period_end: boolean;
}
```

### 8.2 Global Nav 표시 형식

**Free 플랜**:
```
📧 user@example.com
🎫 잔여 횟수: 2/3
💎 구독: Free
```

**Pro 플랜**:
```
📧 user@example.com
🎫 잔여 횟수: 7/10
💎 구독: Pro
```

---

## 9. 외부 연동 명세

### 9.1 Supabase
- **API**: `subscriptions` 테이블 조회
- **쿼리**:
  ```sql
  SELECT plan, remaining_tests, next_billing_date, cancel_at_period_end
  FROM subscriptions
  WHERE user_id = $1;
  ```

### 9.2 Clerk
- **API**: 사용자 이메일 조회 (`useUser()` hook)
- **용도**: Global Nav에 이메일 주소 표시

---

## 10. UI/UX 요구사항

### 10.1 Global Navigation 레이아웃
- 좌측 사이드바 하단에 고정
- 배경: 약간 어두운 배경으로 구분
- 텍스트: 작은 폰트 크기 (12-14px)

### 10.2 업데이트 애니메이션
- 횟수 변경 시 숫자 페이드 인/아웃 효과
- 플랜 변경 시 배지 색상 전환 애니메이션

### 10.3 접근성
- ARIA 레이블 추가: "구독 정보"
- 스크린 리더를 위한 상태 변경 안내

---

## 11. 기술 구현 예시

### 11.1 React Context를 활용한 상태 관리
```typescript
// contexts/SubscriptionContext.tsx
interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  updateSubscription: (data: SubscriptionInfo) => void;
  refreshSubscription: () => Promise<void>;
}

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const updateSubscription = (data: SubscriptionInfo) => {
    setSubscription(data);
  };

  const refreshSubscription = async () => {
    const response = await fetch('/api/subscription/status');
    const data = await response.json();
    setSubscription(data.subscription);
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, updateSubscription, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
```

### 11.2 Global Nav 컴포넌트
```typescript
// components/GlobalNav.tsx
export const GlobalNav = () => {
  const { subscription } = useSubscription();
  const { user } = useUser(); // Clerk

  const maxTests = subscription?.plan === 'pro' ? 10 : 3;

  return (
    <nav className="global-nav">
      <div className="nav-items">
        <Link href="/dashboard">대시보드</Link>
        <Link href="/new-test">새 검사</Link>
      </div>

      <div className="nav-footer">
        <div className="user-email">{user?.emailAddresses[0]?.emailAddress}</div>
        <div className="remaining-tests">
          잔여 횟수: {subscription?.remaining_tests}/{maxTests}
        </div>
        <div className="subscription-plan">
          구독: {subscription?.plan === 'pro' ? 'Pro' : 'Free'}
        </div>
      </div>
    </nav>
  );
};
```

### 11.3 API 응답 예시
```typescript
// pages/api/test/create.ts
export default async function handler(req, res) {
  // ... 검사 생성 로직

  // 구독 정보 조회 및 반환
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, remaining_tests')
    .eq('user_id', userId)
    .single();

  return res.status(200).json({
    testId: newTest.id,
    subscription: {
      plan: subscription.plan,
      remaining_tests: subscription.remaining_tests
    }
  });
}
```

---

## 12. 테스트 시나리오

### 12.1 정상 케이스
1. 새 검사 완료 후 잔여 횟수 감소 확인
2. Pro 구독 후 플랜 및 횟수 변경 확인
3. 구독 취소 후 상태 유지 확인
4. 페이지 새로고침 없이 업데이트 확인

### 12.2 예외 케이스
1. API 실패 시 기존 정보 유지 확인
2. 여러 탭 동시 사용 시 불일치 확인 및 동기화
3. 네트워크 오프라인 시 에러 메시지 확인

---

## 13. 모니터링 및 로깅

### 13.1 로그 항목
- Global Nav 업데이트 성공/실패 횟수
- API 응답 시간
- 클라이언트 에러 발생 빈도

### 13.2 알림 설정
- 구독 정보 조회 실패율 10% 초과 시 알림
- Global Nav 업데이트 에러 발생 시 로그 수집

---

## 14. 참고 문서

- `/docs/userflow.md` - 섹션 13: Global Navigation 실시간 업데이트
- `/docs/database.md` - subscriptions 테이블 스키마
- `/docs/prd.md` - 섹션 5.2: Global Navigation 구조
- [React Context API](https://react.dev/reference/react/createContext)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

**작성자**: Claude Code
**승인자**: Product Owner
**최종 검토일**: 2025-12-12

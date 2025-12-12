# 유스케이스 7: 구독 취소 철회

**기능명**: 구독 취소 철회 (Subscription Reactivation)
**우선순위**: P1 (중요)
**연관 플로우**: userflow.md 7번 - 구독 취소 철회
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

Pro 구독을 취소한 사용자가 다음 결제일 이전에 취소를 철회하여 구독을 정상 상태로 복원하는 기능입니다.

### 1.1 비즈니스 목적
- 구독 취소 후 사용자의 마음이 바뀌었을 때 즉시 복원 가능
- 재구독 과정 없이 간편하게 구독 유지
- 이탈 방지 및 구독 유지율 향상

### 1.2 사용자 가치
- 복잡한 재구독 절차 없이 원클릭으로 구독 복원
- 다음 결제일까지 현재 서비스 계속 이용 가능
- 취소 결정을 유연하게 번복할 수 있는 안전망 제공

---

## 2. 사용자 시나리오

### 2.1 주요 시나리오

**상황**:
Pro 구독 사용자인 김철수님이 일시적으로 비용 절감을 위해 구독을 취소했습니다. 그러나 며칠 후 사주 분석이 필요한 상황이 생겨 구독을 계속 유지하고 싶어졌습니다.

**목표**:
다음 결제일 이전에 취소를 철회하여 Pro 구독을 계속 이용한다.

**플로우**:
1. 김철수님이 `/subscription` 페이지에 접속
2. 현재 구독 상태: "Pro 플랜 (취소 예정)"
3. "다음 결제일(2025-01-15)에 구독이 종료됩니다" 경고 메시지 확인
4. "취소 철회" 버튼 클릭
5. 즉시 정상 구독 상태로 복원
6. "구독 취소가 철회되었습니다" 성공 메시지
7. 다음 결제일에 자동 갱신 예정 안내

**결과**:
- 구독 상태: 취소 예정 → 정상 활성
- 다음 결제일에 자동 결제 진행
- 서비스 중단 없이 계속 이용

---

## 3. 기능 요구사항

### 3.1 입력 조건

#### 필수 조건
- 사용자가 로그인된 상태
- 현재 구독 플랜: Pro
- 구독 상태: `cancel_at_period_end = true`
- 다음 결제일이 아직 도래하지 않음 (`next_billing_date > 오늘`)
- 유효한 빌링키 존재

#### 선택 조건
- 없음

### 3.2 출력 결과

#### 성공 시
- `subscriptions.cancel_at_period_end`: `false`로 업데이트
- UI 변경:
  - "취소 예정" 배지 제거
  - 경고 메시지 제거
  - "취소 철회" 버튼 → "구독 취소" 버튼으로 변경
- 성공 토스트: "구독 취소가 철회되었습니다"
- 안내 메시지: "다음 결제일(YYYY-MM-DD)에 정상적으로 자동 갱신됩니다"

#### 실패 시
- 에러 메시지 표시 및 상태 변경 없음

---

## 4. 처리 프로세스

### 4.1 클라이언트 측

```
사용자 액션
  ↓
[구독 관리 페이지 (/subscription)]
  ↓
현재 구독 상태 확인
  - cancel_at_period_end = true 확인
  - "취소 철회" 버튼 표시
  ↓
사용자 "취소 철회" 버튼 클릭
  ↓
버튼 비활성화 (중복 클릭 방지)
  ↓
API 요청: POST /api/subscription/reactivate
  ↓
로딩 상태 표시
```

### 4.2 서버 측

```
API 요청 수신
  ↓
Clerk 세션 검증 (인증 확인)
  ↓
Supabase에서 현재 구독 조회
  - user_id로 필터링
  ↓
유효성 검증
  1. plan = 'pro' 확인
  2. cancel_at_period_end = true 확인
  3. next_billing_date > CURRENT_DATE 확인
  4. billing_key IS NOT NULL 확인
  ↓
유효성 통과
  ↓
Supabase UPDATE 실행
  - cancel_at_period_end = false
  - updated_at = now()
  ↓
성공 응답 반환
  - 200 OK
  - 업데이트된 구독 정보
```

### 4.3 데이터베이스 변경

**Before:**
```sql
subscriptions {
  user_id: "uuid-123",
  plan: "pro",
  billing_key: "billing_key_abc",
  next_billing_date: "2025-01-15",
  cancel_at_period_end: true,  -- 취소 예정 상태
  remaining_tests: 7
}
```

**After:**
```sql
subscriptions {
  user_id: "uuid-123",
  plan: "pro",
  billing_key: "billing_key_abc",
  next_billing_date: "2025-01-15",
  cancel_at_period_end: false,  -- 정상 구독 복원
  remaining_tests: 7,
  updated_at: "2025-01-10 14:30:00"  -- 자동 업데이트
}
```

---

## 5. UI/UX 상세

### 5.1 구독 관리 페이지 - 취소 예정 상태

**현재 구독 정보 카드:**

```
┌────────────────────────────────────────────┐
│  Pro 플랜 (취소 예정) 🔴                    │
├────────────────────────────────────────────┤
│  ⚠️ 2025년 1월 15일에 구독이 종료됩니다    │
│                                            │
│  잔여 횟수: 7/10                           │
│  사용 모델: Gemini 2.5 Pro                 │
│  월 3,900원 자동 결제                      │
│                                            │
│  [취소 철회]  ← Primary 버튼 (파란색)      │
└────────────────────────────────────────────┘
```

### 5.2 취소 철회 후 - 정상 상태

**현재 구독 정보 카드:**

```
┌────────────────────────────────────────────┐
│  Pro 플랜 ✅                               │
├────────────────────────────────────────────┤
│  잔여 횟수: 7/10                           │
│  다음 결제일: 2025년 1월 15일              │
│  사용 모델: Gemini 2.5 Pro                 │
│  월 3,900원 자동 결제                      │
│                                            │
│  [구독 취소]  ← Danger 버튼 (빨간색)       │
└────────────────────────────────────────────┘

💡 다음 결제일(2025년 1월 15일)에 정상적으로 자동 갱신됩니다
```

### 5.3 성공 토스트 메시지

```
┌──────────────────────────────────────┐
│ ✓ 구독 취소가 철회되었습니다          │
└──────────────────────────────────────┘
```

---

## 6. 엣지케이스

### 6.1 다음 결제일이 이미 지난 경우

**상황:**
사용자가 다음 결제일 이후에 철회를 시도

**처리:**
1. 서버에서 `next_billing_date <= CURRENT_DATE` 감지
2. 이미 구독이 만료되어 철회 불가
3. API가 400 Bad Request 응답

**출력:**
- 에러 메시지: "구독 기간이 만료되어 철회할 수 없습니다"
- 안내 메시지: "다시 구독하려면 새로운 결제가 필요합니다"
- "Pro 시작하기" 버튼 표시

**SQL 조건:**
```sql
WHERE next_billing_date > CURRENT_DATE
```

---

### 6.2 취소 예약 상태가 아닌데 철회 시도

**상황:**
정상 구독 상태(`cancel_at_period_end = false`)에서 철회 시도

**처리:**
1. 클라이언트에서 "취소 철회" 버튼 숨김 (방어적 UI)
2. 서버에서도 검증: `cancel_at_period_end = false` 감지
3. API가 400 Bad Request 응답

**출력:**
- 에러 메시지: "철회할 취소 예약이 없습니다"

**방어 로직:**
```typescript
// 클라이언트
{subscription.cancel_at_period_end && (
  <button onClick={handleReactivate}>취소 철회</button>
)}
```

---

### 6.3 Free 플랜 사용자의 철회 시도

**상황:**
Free 플랜 사용자가 철회 API 직접 호출

**처리:**
1. 서버에서 `plan = 'free'` 감지
2. API가 400 Bad Request 응답

**출력:**
- 에러 메시지: "Pro 구독 중인 사용자만 사용할 수 있습니다"

---

### 6.4 API 호출 실패 (네트워크 오류)

**상황:**
클라이언트-서버 간 통신 실패

**처리:**
1. 클라이언트에서 에러 캐치
2. 재시도 안내

**출력:**
- 에러 메시지: "철회에 실패했습니다. 다시 시도해주세요"
- "다시 시도" 버튼 표시
- 버튼 활성화 (재시도 가능)

---

### 6.5 중복 요청 (연타 클릭)

**상황:**
사용자가 "취소 철회" 버튼 연타

**처리:**
1. 클라이언트에서 버튼 비활성화 (첫 클릭 후)
2. 서버에서 멱등성 보장 (이미 `false`면 그대로 유지)

**출력:**
- 첫 번째 요청만 처리
- 이후 요청은 무시하거나 동일 응답 반환

---

### 6.6 Supabase 연결 실패

**상황:**
데이터베이스 일시적 장애

**처리:**
1. 서버에서 DB 연결 에러 캐치
2. 500 Internal Server Error 응답

**출력:**
- 에러 메시지: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요"
- 로그에 에러 기록
- 관리자 알림 (선택)

---

## 7. API 명세

### 7.1 엔드포인트

```
POST /api/subscription/reactivate
```

### 7.2 요청

**Headers:**
```http
Authorization: Bearer {clerk_session_token}
Content-Type: application/json
```

**Body:**
```json
{}
```
(빈 객체, user_id는 세션에서 추출)

### 7.3 응답

#### 성공 (200 OK)

```json
{
  "success": true,
  "subscription": {
    "plan": "pro",
    "cancel_at_period_end": false,
    "next_billing_date": "2025-01-15",
    "remaining_tests": 7
  },
  "message": "구독 취소가 철회되었습니다"
}
```

#### 실패 - 이미 만료됨 (400 Bad Request)

```json
{
  "success": false,
  "error": "SUBSCRIPTION_EXPIRED",
  "message": "구독 기간이 만료되어 철회할 수 없습니다"
}
```

#### 실패 - 취소 예약 없음 (400 Bad Request)

```json
{
  "success": false,
  "error": "NO_CANCELLATION",
  "message": "철회할 취소 예약이 없습니다"
}
```

#### 실패 - Free 플랜 (400 Bad Request)

```json
{
  "success": false,
  "error": "NOT_PRO_PLAN",
  "message": "Pro 구독 중인 사용자만 사용할 수 있습니다"
}
```

#### 실패 - 인증 실패 (401 Unauthorized)

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다"
}
```

#### 실패 - 서버 에러 (500 Internal Server Error)

```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "일시적인 오류가 발생했습니다"
}
```

---

## 8. 데이터베이스 쿼리

### 8.1 구독 상태 조회

```sql
SELECT
  id,
  plan,
  cancel_at_period_end,
  next_billing_date,
  billing_key
FROM subscriptions
WHERE user_id = $1;
```

### 8.2 철회 처리 (UPDATE)

```sql
UPDATE subscriptions
SET cancel_at_period_end = false
WHERE user_id = $1
  AND plan = 'pro'
  AND cancel_at_period_end = true
  AND next_billing_date > CURRENT_DATE
  AND billing_key IS NOT NULL
RETURNING
  plan,
  cancel_at_period_end,
  next_billing_date,
  remaining_tests;
```

**조건 설명:**
- `user_id = $1`: 현재 사용자만
- `plan = 'pro'`: Pro 플랜만
- `cancel_at_period_end = true`: 취소 예약된 상태만
- `next_billing_date > CURRENT_DATE`: 아직 만료되지 않음
- `billing_key IS NOT NULL`: 유효한 빌링키 존재

**RETURNING:**
- 업데이트된 구독 정보를 즉시 반환하여 응답에 사용

---

## 9. 외부 연동

### 9.1 Clerk (인증)

**역할:**
- 사용자 인증 상태 확인
- JWT 토큰에서 `clerk_user_id` 추출

**연동 방식:**
```typescript
import { auth } from '@clerk/nextjs';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return Response.json(
      { error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  // ... 처리 로직
}
```

### 9.2 Supabase (데이터베이스)

**역할:**
- 구독 정보 조회 및 업데이트

**연동 방식:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data, error } = await supabase
  .from('subscriptions')
  .update({ cancel_at_period_end: false })
  .eq('user_id', userId)
  .eq('plan', 'pro')
  .eq('cancel_at_period_end', true)
  .gt('next_billing_date', new Date().toISOString().split('T')[0])
  .not('billing_key', 'is', null)
  .select()
  .single();
```

### 9.3 토스페이먼츠

**이 기능에서는 사용하지 않음**
- 빌링키는 그대로 유지
- 다음 결제일에 자동 결제 진행

---

## 10. 테스트 시나리오

### 10.1 정상 플로우 테스트

**Given:**
- Pro 플랜 사용자
- `cancel_at_period_end = true`
- `next_billing_date = 2025-01-15` (미래)

**When:**
- "취소 철회" 버튼 클릭

**Then:**
- `cancel_at_period_end = false`로 변경
- 성공 메시지 표시
- UI 업데이트 (버튼, 배지, 경고 제거)

---

### 10.2 만료 후 철회 시도

**Given:**
- Pro 플랜 사용자 (과거)
- `cancel_at_period_end = true`
- `next_billing_date = 2024-12-01` (과거)

**When:**
- 철회 API 호출

**Then:**
- 400 에러 응답
- "구독 기간이 만료되어 철회할 수 없습니다" 메시지
- "Pro 시작하기" 버튼 제공

---

### 10.3 Free 플랜 사용자의 시도

**Given:**
- Free 플랜 사용자

**When:**
- 철회 API 직접 호출 (비정상 접근)

**Then:**
- 400 에러 응답
- "Pro 구독 중인 사용자만 사용할 수 있습니다" 메시지

---

### 10.4 정상 구독 상태에서 철회 시도

**Given:**
- Pro 플랜 사용자
- `cancel_at_period_end = false` (정상 구독)

**When:**
- 철회 API 호출 (비정상 접근)

**Then:**
- 400 에러 응답
- "철회할 취소 예약이 없습니다" 메시지

---

### 10.5 네트워크 오류 처리

**Given:**
- Pro 플랜 사용자 (취소 예정)
- 네트워크 일시 장애

**When:**
- "취소 철회" 버튼 클릭

**Then:**
- "철회에 실패했습니다. 다시 시도해주세요" 메시지
- "다시 시도" 버튼 표시
- 상태 변경 없음

---

## 11. 비기능 요구사항

### 11.1 성능
- API 응답 시간: 500ms 이내
- 데이터베이스 쿼리: 100ms 이내

### 11.2 보안
- Clerk 세션 검증 필수
- Supabase RLS 정책 적용
- SQL Injection 방지 (파라미터화된 쿼리)

### 11.3 가용성
- 네트워크 오류 시 재시도 가능
- 서버 장애 시 명확한 에러 메시지

### 11.4 사용성
- 원클릭 철회
- 명확한 상태 표시 (취소 예정 ↔ 정상)
- 즉각적인 피드백 (토스트 메시지)

---

## 12. 후속 작업

### 12.1 즉시 필요
- 없음 (이 기능은 독립적으로 완결)

### 12.2 향후 개선
1. **이메일 알림**
   - 철회 완료 시 이메일 발송
   - "구독 취소가 철회되었습니다" 안내

2. **분석 추적**
   - 철회율 측정 (취소 후 철회한 비율)
   - 철회까지의 평균 시간 분석

3. **A/B 테스트**
   - 철회 버튼 위치 최적화
   - 메시지 문구 테스트

---

## 13. 참고 자료

### 13.1 관련 문서
- `/docs/userflow.md` - 7번 플로우
- `/docs/prd.md` - FR-2.3: 구독 취소 철회
- `/docs/database.md` - subscriptions 테이블

### 13.2 관련 기능
- 유스케이스 6: 구독 취소
- 유스케이스 8: 정기결제 자동 실행

---

## 14. 체크리스트

### 개발 전
- [ ] 데이터베이스 스키마 확인
- [ ] API 엔드포인트 설계 검토
- [ ] Clerk 인증 통합 확인

### 개발 중
- [ ] API 핸들러 구현 (`/api/subscription/reactivate`)
- [ ] 유효성 검증 로직 구현
- [ ] Supabase 쿼리 작성 및 테스트
- [ ] 클라이언트 UI 구현
- [ ] 에러 처리 구현
- [ ] 로딩 상태 처리

### 개발 후
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 실행
- [ ] 엣지케이스 테스트
- [ ] UI/UX 검토
- [ ] 성능 테스트 (응답 시간)
- [ ] 보안 검토 (인증, RLS)

---

**문서 작성 완료**
**작성일**: 2025-12-12
**버전**: 1.0
**작성자**: Development Team

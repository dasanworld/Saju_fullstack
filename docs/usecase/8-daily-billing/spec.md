# 유스케이스: 정기결제 자동 실행 (Supabase Cron)

**기능 번호**: 8
**기능명**: 정기결제 자동 실행
**버전**: 1.0
**작성일**: 2025-12-12

---

## 1. 개요

### 1.1 목적
Pro 구독 사용자의 월간 정기결제를 자동으로 처리하고, 결제 성공/실패에 따라 구독 상태를 갱신합니다.

### 1.2 범위
- Supabase Cron을 통한 매일 02:00 자동 실행
- 오늘이 결제일인 Pro 구독 건들 탐색
- 토스페이먼츠 빌링키를 이용한 자동 결제 실행
- 결제 성공 시: 잔여 횟수 초기화 및 구독 기간 연장
- 결제 실패 시: 즉시 구독 해지 및 빌링키 삭제

### 1.3 사전 조건
- Supabase Cron Job이 설정되어 있어야 함
- 토스페이먼츠 빌링키 발급이 완료된 Pro 구독이 존재해야 함
- Next.js API 엔드포인트(`/api/cron/daily-billing`)가 구현되어 있어야 함
- Cron 인증을 위한 비밀 토큰이 환경변수에 설정되어 있어야 함

---

## 2. 액터

### 2.1 주 액터
- **Supabase Cron Job**: 매일 02:00에 자동으로 결제 처리 API를 호출하는 스케줄러

### 2.2 부 액터
- **Next.js API Handler**: 결제 로직을 실제로 수행하는 서버 엔드포인트
- **토스페이먼츠 API**: 빌링키를 통한 자동 결제 실행
- **Pro 구독 사용자**: 결제 대상이 되는 사용자들

---

## 3. 트리거

### 3.1 자동 트리거
- Supabase Cron이 매일 02:00(KST)에 자동 실행
- Cron 표현식: `0 2 * * *`

### 3.2 실행 조건
- 현재 날짜가 `next_billing_date`와 일치하는 Pro 구독이 존재
- `plan = 'pro'`
- `cancel_at_period_end = false` (취소 예약 상태가 아님)

---

## 4. 정상 플로우

### 4.1 Cron 트리거 및 인증
```
1. Supabase Cron이 매일 02:00에 실행
2. POST /api/cron/daily-billing 호출
3. 요청 헤더에 Authorization Bearer 토큰 포함
4. 서버에서 비밀 토큰 검증
   - 일치하지 않으면 401 Unauthorized 반환
5. 인증 성공 시 결제 처리 프로세스 시작
```

### 4.2 결제 대상 조회
```sql
SELECT
  s.id,
  s.user_id,
  s.billing_key,
  u.email,
  u.clerk_user_id
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.next_billing_date = CURRENT_DATE
  AND s.plan = 'pro'
  AND s.cancel_at_period_end = false;
```

### 4.3 각 구독 건별 결제 처리

#### 4.3.1 결제 실행
```
1. 토스페이먼츠 빌링키 결제 API 호출
   - billing_key 사용
   - 결제 금액: 3,900원
   - 고객 정보: email, name
```

#### 4.3.2 결제 성공 처리
```sql
UPDATE subscriptions
SET
  remaining_tests = 10,
  next_billing_date = next_billing_date + INTERVAL '1 month'
WHERE id = {subscription_id};
```

**처리 결과**:
- 잔여 횟수가 10회로 초기화됨
- 다음 결제일이 1개월 연장됨
- 사용자는 다음 로그인 시 갱신된 정보를 확인 가능

#### 4.3.3 결제 실패 처리
```
1. 토스페이먼츠 빌링키 삭제 API 호출
2. Supabase subscriptions 테이블 업데이트
```

```sql
UPDATE subscriptions
SET
  plan = 'free',
  billing_key = NULL,
  next_billing_date = NULL,
  remaining_tests = 0,
  cancel_at_period_end = false
WHERE id = {subscription_id};
```

**처리 결과**:
- Pro 플랜이 Free 플랜으로 전환됨
- 빌링키가 삭제됨
- 잔여 횟수가 0으로 설정됨
- 사용자는 다음 로그인 시 구독 해지를 확인

### 4.4 로깅 및 알림
```
1. 처리 결과를 로그에 기록
   - 성공 건수
   - 실패 건수
   - 각 실패 사유
2. (선택) 사용자에게 이메일 알림 발송
   - 결제 성공: "Pro 구독이 갱신되었습니다"
   - 결제 실패: "결제에 실패하여 구독이 해지되었습니다"
3. (선택) 관리자에게 일일 결제 리포트 전송
```

---

## 5. 예외 플로우

### 5.1 비밀 토큰 불일치 (비정상 요청)

**시나리오**: 외부에서 Cron API를 무단으로 호출 시도

**처리**:
```
1. 요청 헤더의 Authorization 토큰 검증
2. 환경변수 CRON_SECRET과 불일치 감지
3. 401 Unauthorized 응답 반환
4. 로그에 비정상 접근 기록
5. (선택) 관리자에게 보안 알림 전송
```

**결과**: 결제 처리가 실행되지 않음

---

### 5.2 오늘이 결제일인 구독이 없음

**시나리오**: 대부분의 날짜에 발생 (결제일이 분산되어 있음)

**처리**:
```
1. Supabase 쿼리 결과가 빈 배열
2. 로그에 "오늘 처리할 결제 없음" 기록
3. 200 OK 응답 반환
4. Cron 작업 정상 종료
```

**결과**: 정상적인 상황으로 간주, 에러 없음

---

### 5.3 토스페이먼츠 API 일시적 장애

**시나리오**: 토스페이먼츠 서버 점검 또는 일시적 장애

**처리**:
```
1. 결제 API 호출 시 타임아웃 또는 5xx 에러 발생
2. 재시도 로직 실행 (최대 3회, 지수 백오프)
   - 1차 시도: 즉시
   - 2차 시도: 5초 후
   - 3차 시도: 15초 후
3. 모든 재시도 실패 시:
   - 해당 구독 건너뛰기 (다음 건 처리)
   - 로그에 재시도 실패 기록
   - 관리자에게 알림 전송
```

**결과**:
- 해당 사용자의 결제는 처리되지 않음
- 다음날 Cron에서 재시도 (결제일이 아직 유효한 경우)
- 수동 처리 또는 고객 연락 필요

---

### 5.4 빌링키 삭제 API 실패

**시나리오**: 결제 실패 후 빌링키 삭제 API 호출이 실패

**처리**:
```
1. 구독 해지 처리는 완료 (DB 업데이트)
   - plan = 'free'
   - billing_key = NULL (DB에서만)
   - remaining_tests = 0
2. 토스페이먼츠 빌링키 삭제 API 실패
3. 로그에 에러 기록
4. 관리자에게 알림 전송 (수동 삭제 필요)
```

**결과**:
- 사용자는 구독 해지됨 (정상)
- 빌링키는 토스페이먼츠에 남아 있음 (수동 삭제 필요)
- 다음 결제 시도는 발생하지 않음 (DB에서 이미 삭제)

---

### 5.5 Supabase 연결 실패

**시나리오**: Supabase 서버 장애 또는 네트워크 오류

**처리**:
```
1. Cron 핸들러에서 DB 연결 에러 캐치
2. 500 Internal Server Error 응답 반환
3. 로그에 에러 스택 기록
4. 관리자에게 긴급 알림 전송
```

**결과**:
- Supabase Cron이 재시도 (설정에 따라)
- 또는 다음날 Cron에서 재처리
- 시스템 복구 후 정상화

---

### 5.6 동일 구독에 대해 Cron이 중복 실행

**시나리오**: Supabase Cron이 실수로 동일 시간에 중복 실행

**처리**:
```
1. DB 트랜잭션으로 동시성 제어
2. next_billing_date를 WHERE 조건에 포함
3. 첫 번째 UPDATE가 성공하면 next_billing_date가 변경됨
4. 두 번째 UPDATE는 WHERE 조건 불일치로 실행되지 않음
```

**결과**:
- 첫 번째 실행만 처리됨
- 중복 결제 방지
- 사용자에게 영향 없음

---

### 5.7 취소 예약 상태 구독의 만료 처리

**시나리오**: `cancel_at_period_end = true`인 구독의 결제일 도래

**처리**:
```
1. 결제 대상 쿼리에서 제외됨
   (WHERE 조건: cancel_at_period_end = false)
2. 별도 로직으로 만료 처리 실행
```

```sql
UPDATE subscriptions
SET
  plan = 'free',
  billing_key = NULL,
  next_billing_date = NULL,
  remaining_tests = 0,
  cancel_at_period_end = false
WHERE next_billing_date = CURRENT_DATE
  AND cancel_at_period_end = true;
```

**후속 처리**:
```
1. 토스페이먼츠 빌링키 삭제 API 호출
2. (선택) 사용자에게 이메일 알림
   - "Pro 구독이 종료되었습니다"
```

**결과**:
- 결제 시도 없음
- 사용자 구독이 Free로 전환됨
- 빌링키 삭제됨

---

## 6. 데이터 처리

### 6.1 입력 데이터
- **Cron 요청**: Authorization Bearer 토큰
- **환경변수**: CRON_SECRET, TOSS_SECRET_KEY

### 6.2 조회 데이터
```typescript
interface BillingTarget {
  id: string;              // subscription_id
  user_id: string;
  billing_key: string;
  email: string;
  clerk_user_id: string;
}
```

### 6.3 출력 데이터
```typescript
interface BillingResult {
  total_count: number;     // 총 처리 건수
  success_count: number;   // 결제 성공 건수
  failure_count: number;   // 결제 실패 건수
  failures: Array<{
    subscription_id: string;
    email: string;
    error_message: string;
  }>;
}
```

---

## 7. 비기능 요구사항

### 7.1 성능
- 단일 결제 처리 시간: 5초 이내
- 100건 동시 처리 시간: 10분 이내 (순차 처리 기준)
- API 타임아웃: 30초

### 7.2 보안
- Cron API는 비밀 토큰 검증 필수
- 토스페이먼츠 API 키는 환경변수로 관리
- 빌링키는 암호화 저장 권장 (Supabase Vault)

### 7.3 가용성
- 재시도 로직으로 일시적 장애 대응
- 실패 건은 로그 기록 및 관리자 알림
- 수동 재처리 스크립트 준비 필요

### 7.4 모니터링
- 결제 성공률 모니터링 (목표: 95% 이상)
- 일일 결제 리포트 (성공/실패 건수)
- 에러 로그 수집 및 알림

---

## 8. API 명세

### 8.1 엔드포인트
```
POST /api/cron/daily-billing
```

### 8.2 요청 헤더
```
Authorization: Bearer {CRON_SECRET}
Content-Type: application/json
```

### 8.3 요청 본문
```json
{}
```
(빈 객체)

### 8.4 응답 (성공)
```json
{
  "status": "success",
  "data": {
    "total_count": 15,
    "success_count": 14,
    "failure_count": 1,
    "failures": [
      {
        "subscription_id": "uuid",
        "email": "user@example.com",
        "error_message": "카드 한도 초과"
      }
    ]
  }
}
```

### 8.5 응답 (인증 실패)
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```

---

## 9. 외부 연동

### 9.1 Supabase Cron 설정
```sql
SELECT cron.schedule(
  'daily-billing',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-domain.vercel.app/api/cron/daily-billing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 9.2 토스페이먼츠 API

#### 빌링키 결제
```
POST https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {Base64(TOSS_SECRET_KEY:)}
Content-Type: application/json

{
  "customerKey": "{clerk_user_id}",
  "amount": 3900,
  "orderId": "order_{timestamp}_{subscription_id}",
  "orderName": "Saju피아 Pro 월 구독",
  "customerEmail": "{email}"
}
```

#### 빌링키 삭제
```
DELETE https://api.tosspayments.com/v1/billing/authorizations/{billingKey}
Authorization: Basic {Base64(TOSS_SECRET_KEY:)}
```

---

## 10. 테스트 시나리오

### 10.1 정상 케이스
```
Given: 오늘이 2025-12-12이고, next_billing_date가 2025-12-12인 Pro 구독이 3건 존재
When: Cron이 02:00에 실행
Then:
  - 3건 모두 결제 시도
  - 성공한 구독은 next_billing_date가 2026-01-12로 변경
  - remaining_tests가 10으로 초기화
```

### 10.2 결제 실패 케이스
```
Given: 오늘이 결제일인 Pro 구독 1건 (카드 잔액 부족)
When: Cron이 실행되고 결제 시도
Then:
  - 토스페이먼츠 결제 API가 400 에러 반환
  - 구독이 Free로 전환
  - billing_key가 NULL로 변경
  - 빌링키 삭제 API 호출
  - 사용자에게 알림 발송
```

### 10.3 취소 예약 만료 케이스
```
Given: cancel_at_period_end = true, next_billing_date = 오늘
When: Cron이 실행
Then:
  - 결제 시도 없음
  - 구독이 Free로 전환
  - 빌링키 삭제
  - 사용자에게 "구독 종료" 알림
```

### 10.4 비인증 요청 케이스
```
Given: 외부에서 잘못된 토큰으로 API 호출
When: POST /api/cron/daily-billing (잘못된 토큰)
Then:
  - 401 Unauthorized 응답
  - 결제 처리 실행 안 됨
  - 보안 로그 기록
```

---

## 11. 관련 페이지 및 API

### 11.1 관련 페이지
- 없음 (백그라운드 작업)

### 11.2 관련 API
- `POST /api/cron/daily-billing`: Cron 핸들러
- `GET /api/subscription/status`: 사용자가 갱신된 구독 정보 조회

### 11.3 영향받는 페이지
- `/subscription`: 구독 관리 페이지 (결제 후 정보 갱신됨)
- `/dashboard`: 대시보드 (잔여 횟수 갱신됨)
- Global Nav: 하단 구독 정보 (잔여 횟수, 플랜 표시)

---

## 12. 환경변수

```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Toss Payments
TOSS_SECRET_KEY=your_toss_secret_key

# Cron
CRON_SECRET=your_random_secret_string
```

---

## 13. 주의사항

### 13.1 시간대 설정
- Supabase Cron은 UTC 기준으로 작동
- 한국 시간(KST) 02:00 = UTC 17:00 (전날)
- Cron 표현식: `0 17 * * *` (UTC 기준)

### 13.2 트랜잭션 관리
- 결제 성공/실패 처리는 각각 독립적인 트랜잭션
- 다른 구독 건의 실패가 전체 처리를 중단시키지 않음

### 13.3 로그 보존
- 결제 처리 로그는 최소 1년 이상 보관
- 실패 건은 별도 테이블 또는 파일로 기록 권장

### 13.4 수동 재처리
- Cron 실패 시 수동 재처리 스크립트 준비
- 관리자용 대시보드에서 재처리 버튼 제공 권장

---

## 14. 개선 방향

### 14.1 우선순위 높음
- 결제 실패 사용자에게 이메일 자동 발송
- 결제 성공 사용자에게 영수증 이메일 발송
- 관리자용 일일 결제 리포트 대시보드

### 14.2 우선순위 중간
- 결제 실패 시 재시도 로직 (1주일 내 3회)
- 결제 예정일 3일 전 알림 이메일
- payments 테이블 추가로 결제 이력 보관

### 14.3 우선순위 낮음
- Slack 또는 Discord 웹훅으로 실시간 알림
- 결제 성공률 그래프 시각화
- A/B 테스트: 결제 시간대 최적화

---

**작성자**: Claude Code
**검토자**: (To be assigned)
**승인 상태**: Draft

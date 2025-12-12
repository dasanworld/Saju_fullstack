# 유스케이스 6: 구독 취소 (Subscription Cancellation)

**프로젝트**: Saju피아 - AI 기반 사주팔자 분석 SaaS
**작성일**: 2025-12-12
**버전**: 1.0
**우선순위**: P0 (필수)

---

## 1. 개요

### 1.1 목적
Pro 구독 사용자가 자신의 구독을 취소할 수 있도록 하되, 다음 결제일까지는 서비스를 계속 이용할 수 있도록 하는 기능입니다.

### 1.2 배경
- 사용자가 언제든지 자유롭게 구독을 중단할 수 있어야 합니다
- 이미 결제한 금액에 대한 서비스는 제공되어야 합니다 (환불 불가)
- 사용자의 실수로 인한 취소를 철회할 수 있는 옵션을 제공해야 합니다

### 1.3 범위
- **포함**: 구독 취소 예약, 취소 철회, 구독 완전 해지
- **제외**: 즉시 해지, 부분 환불, 구독 일시정지

---

## 2. 사용자 스토리

### User Story 1: 구독 취소 예약
```
As a Pro 구독자
I want to 내 구독을 취소하고 싶습니다
So that 더 이상 자동 결제가 이루어지지 않습니다
```

### User Story 2: 취소 철회
```
As a 구독 취소를 예약한 사용자
I want to 취소를 철회하고 구독을 계속하고 싶습니다
So that 다음 결제일에도 Pro 서비스를 계속 이용할 수 있습니다
```

### User Story 3: 구독 완전 해지
```
As a 시스템 (Cron)
I want to 다음 결제일이 도래한 취소 예약 구독을 해지합니다
So that 빌링키가 삭제되고 Free 플랜으로 전환됩니다
```

---

## 3. 액터 (Actors)

### 3.1 Primary Actor
- **Pro 구독자**: 현재 Pro 플랜을 이용 중이며 자동 결제가 설정된 사용자

### 3.2 Supporting Actors
- **Supabase Cron**: 매일 02:00에 실행되는 정기 작업
- **토스페이먼츠 API**: 빌링키 삭제를 처리하는 외부 서비스

---

## 4. 사전 조건 (Preconditions)

### 4.1 구독 취소 예약
- 사용자가 Clerk를 통해 인증된 상태여야 합니다
- 사용자가 현재 Pro 플랜을 사용 중이어야 합니다 (`plan = 'pro'`)
- 빌링키가 등록되어 있어야 합니다 (`billing_key IS NOT NULL`)
- 아직 취소 예약 상태가 아니어야 합니다 (`cancel_at_period_end = false`)

### 4.2 취소 철회
- 사용자가 취소 예약 상태여야 합니다 (`cancel_at_period_end = true`)
- 다음 결제일이 아직 도래하지 않았어야 합니다 (`next_billing_date > 오늘`)

### 4.3 구독 완전 해지
- 취소 예약 상태여야 합니다 (`cancel_at_period_end = true`)
- 다음 결제일이 오늘이어야 합니다 (`next_billing_date = 오늘`)

---

## 5. 기본 플로우 (Basic Flow)

### 5.1 구독 취소 예약 플로우

#### 입력
1. 사용자가 `/subscription` 페이지 접근
2. "구독 취소" 버튼 클릭
3. 확인 모달에서 "취소하기" 버튼 클릭

#### 처리
1. 확인 모달 표시
   - 제목: "구독을 취소하시겠습니까?"
   - 안내 문구:
     - "다음 결제일(YYYY-MM-DD)까지 서비스를 계속 이용하실 수 있습니다"
     - "결제일 이전에는 언제든지 취소를 철회할 수 있습니다"
     - "환불은 불가합니다"

2. 사용자 확인 후 `/api/subscription/cancel` POST 요청

3. 서버 처리:
   - Clerk 세션 검증
   - 사용자의 구독 정보 조회
   - Pro 플랜 및 빌링키 존재 확인
   - Supabase `subscriptions` 테이블 업데이트:
     ```sql
     UPDATE subscriptions
     SET cancel_at_period_end = true
     WHERE user_id = $1
       AND plan = 'pro'
       AND billing_key IS NOT NULL
       AND cancel_at_period_end = false;
     ```

#### 출력
- 확인 모달 닫힘
- 성공 토스트 메시지: "구독 취소가 예약되었습니다"
- 구독 정보 카드 업데이트:
  - "취소 예정" 배지 표시
  - 경고 메시지: "다음 결제일(YYYY-MM-DD)에 구독이 종료됩니다"
  - "구독 취소" 버튼 → "취소 철회" 버튼으로 변경
- Pro 서비스 계속 이용 가능 (잔여 횟수 유지)

---

### 5.2 취소 철회 플로우

#### 입력
1. 사용자가 취소 예약 상태에서 `/subscription` 페이지 접근
2. "취소 철회" 버튼 클릭

#### 처리
1. `/api/subscription/reactivate` POST 요청

2. 서버 처리:
   - Clerk 세션 검증
   - 사용자의 구독 정보 조회
   - 취소 예약 상태 확인 (`cancel_at_period_end = true`)
   - 다음 결제일 유효성 확인 (`next_billing_date > 오늘`)
   - Supabase `subscriptions` 테이블 업데이트:
     ```sql
     UPDATE subscriptions
     SET cancel_at_period_end = false
     WHERE user_id = $1
       AND cancel_at_period_end = true
       AND next_billing_date > CURRENT_DATE;
     ```

#### 출력
- 성공 토스트 메시지: "구독 취소가 철회되었습니다"
- 구독 정보 카드 업데이트:
  - "취소 예정" 배지 제거
  - 경고 메시지 제거
  - "취소 철회" 버튼 → "구독 취소" 버튼으로 변경
- 다음 결제일에 정상적으로 자동 갱신 예정

---

### 5.3 구독 완전 해지 플로우 (Cron)

#### 입력
- Supabase Cron이 매일 02:00에 `/api/cron/daily-billing` 호출
- 오늘이 다음 결제일이고 취소 예약된 구독들 조회

#### 처리
1. 비밀 토큰 검증

2. 취소 예약된 구독 조회:
   ```sql
   SELECT
     s.id,
     s.user_id,
     s.billing_key,
     u.email
   FROM subscriptions s
   JOIN users u ON s.user_id = u.id
   WHERE s.next_billing_date = CURRENT_DATE
     AND s.cancel_at_period_end = true
     AND s.plan = 'pro';
   ```

3. 각 구독에 대해:
   - 토스페이먼츠 빌링키 삭제 API 호출
   - Supabase `subscriptions` 테이블 업데이트:
     ```sql
     UPDATE subscriptions
     SET
       plan = 'free',
       billing_key = NULL,
       next_billing_date = NULL,
       remaining_tests = 0,
       cancel_at_period_end = false
     WHERE id = $1;
     ```

4. 처리 결과 로그 저장

#### 출력
- 사용자가 다음 로그인 시:
  - 구독 플랜: "Free" 표시
  - 잔여 횟수: 0/3 표시
  - "Pro로 업그레이드" 버튼 표시
- (선택) 이메일 알림: "Pro 구독이 종료되었습니다"

---

## 6. 대체 플로우 (Alternative Flows)

### 6.1 AF-1: 확인 모달에서 "돌아가기" 클릭
**조건**: 사용자가 구독 취소 확인 모달에서 "돌아가기" 선택

**처리**:
- 모달 닫기
- API 호출 없음

**결과**:
- 구독 상태 변경 없음
- 구독 관리 페이지로 복귀

---

### 6.2 AF-2: Free 플랜 사용자가 취소 시도
**조건**: Free 플랜 사용자가 구독 취소 시도

**처리**:
- 클라이언트: Free 플랜 시 "구독 취소" 버튼 숨김 처리
- 서버: `plan = 'free'` 감지 시 400 Bad Request 응답

**결과**:
- 에러 메시지: "취소할 구독이 없습니다"

---

### 6.3 AF-3: 이미 취소 예약된 구독을 다시 취소 시도
**조건**: `cancel_at_period_end = true` 상태에서 취소 재시도

**처리**:
- 서버에서 중복 상태 감지
- 409 Conflict 응답

**결과**:
- 메시지: "이미 취소 예약되었습니다"
- 현재 상태 유지

---

## 7. 예외 플로우 (Exception Flows)

### 7.1 EF-1: 다음 결제일이 지난 후 철회 시도
**조건**: `next_billing_date <= 오늘` 상태에서 취소 철회 시도

**처리**:
- 서버에서 날짜 검증
- 400 Bad Request 응답

**결과**:
- 에러 메시지: "구독 기간이 만료되어 철회할 수 없습니다"
- 안내: "다시 구독하려면 새로운 결제가 필요합니다"
- "Pro 시작하기" 버튼 표시

---

### 7.2 EF-2: API 호출 실패 (네트워크 오류)
**조건**: 취소 또는 철회 API 호출 중 네트워크 오류 발생

**처리**:
- 클라이언트에서 에러 캐치
- 재시도 안내

**결과**:
- 에러 메시지: "요청에 실패했습니다. 다시 시도해주세요"
- "재시도" 버튼 표시

---

### 7.3 EF-3: 빌링키 삭제 API 실패 (Cron)
**조건**: 토스페이먼츠 빌링키 삭제 API 호출 실패

**처리**:
- DB에서는 구독 해지 완료 처리
- 로그에 에러 기록
- 관리자에게 알림

**결과**:
- 사용자: Free 플랜으로 전환됨
- 시스템: 빌링키가 토스페이먼츠에 남아 있음 (수동 처리 필요)

---

### 7.4 EF-4: Supabase 연결 실패 (Cron)
**조건**: Cron 실행 중 DB 연결 오류 발생

**처리**:
- 500 Internal Server Error 응답
- Supabase Cron이 재시도 (설정에 따라)
- 로그에 에러 기록

**결과**:
- 관리자에게 긴급 알림
- 해당 날짜 구독 해지 처리 누락 가능 (다음날 재시도)

---

## 8. 사후 조건 (Postconditions)

### 8.1 성공 시 (구독 취소 예약)
- `subscriptions.cancel_at_period_end = true` 상태
- Pro 서비스 계속 이용 가능
- 다음 결제일에 자동 결제 없음
- 사용자에게 취소 예약 상태 표시

### 8.2 성공 시 (취소 철회)
- `subscriptions.cancel_at_period_end = false` 복구
- 다음 결제일에 정상 자동 갱신 예정
- 사용자에게 정상 구독 상태 표시

### 8.3 성공 시 (구독 완전 해지)
- 구독 플랜: Free로 전환
- 빌링키: 삭제됨
- 잔여 횟수: 0으로 초기화
- 재구독 시 새로운 빌링키 발급 필요

---

## 9. 비기능 요구사항

### 9.1 성능
- API 응답 시간: 1초 이내
- Cron 처리 시간: 100건 기준 5분 이내

### 9.2 보안
- API 요청은 Clerk 인증 필수
- Cron 요청은 비밀 토큰 검증 필수
- 다른 사용자의 구독 접근 차단 (RLS)

### 9.3 안정성
- 빌링키 삭제 실패 시에도 구독 해지는 완료되어야 함
- 모든 상태 변경은 트랜잭션으로 처리
- Cron 실패 시 재시도 로직 적용

---

## 10. 데이터 요구사항

### 10.1 입력 데이터
**구독 취소 API**:
- 없음 (사용자 세션에서 user_id 추출)

**취소 철회 API**:
- 없음 (사용자 세션에서 user_id 추출)

**Cron**:
- Authorization header (비밀 토큰)

### 10.2 출력 데이터
**구독 취소 API**:
```json
{
  "success": true,
  "message": "구독 취소가 예약되었습니다",
  "next_billing_date": "2025-02-12",
  "cancel_at_period_end": true
}
```

**취소 철회 API**:
```json
{
  "success": true,
  "message": "구독 취소가 철회되었습니다",
  "cancel_at_period_end": false
}
```

### 10.3 데이터베이스 변경
**구독 취소**:
```sql
subscriptions {
  cancel_at_period_end: false → true
}
```

**취소 철회**:
```sql
subscriptions {
  cancel_at_period_end: true → false
}
```

**구독 완전 해지**:
```sql
subscriptions {
  plan: 'pro' → 'free',
  billing_key: '<key>' → NULL,
  next_billing_date: '2025-02-12' → NULL,
  remaining_tests: X → 0,
  cancel_at_period_end: true → false
}
```

---

## 11. UI 요구사항

### 11.1 구독 관리 페이지 - 정상 구독 상태
```
┌─────────────────────────────────────┐
│ Pro 플랜                            │
├─────────────────────────────────────┤
│ 잔여 횟수: 7/10                     │
│ 다음 결제일: 2025년 2월 12일        │
│ 사용 모델: Gemini 2.5 Pro           │
│ 월 3,900원 자동 결제                │
├─────────────────────────────────────┤
│ [구독 취소]                         │
└─────────────────────────────────────┘
```

### 11.2 구독 취소 확인 모달
```
┌─────────────────────────────────────┐
│ 구독을 취소하시겠습니까?            │
├─────────────────────────────────────┤
│ • 다음 결제일(2025-02-12)까지       │
│   서비스를 계속 이용하실 수 있습니다│
│ • 결제일 이전에는 언제든지          │
│   취소를 철회할 수 있습니다         │
│ • 환불은 불가합니다                 │
├─────────────────────────────────────┤
│ [돌아가기]      [취소하기]          │
└─────────────────────────────────────┘
```

### 11.3 구독 관리 페이지 - 취소 예약 상태
```
┌─────────────────────────────────────┐
│ Pro 플랜 [취소 예정]                │
├─────────────────────────────────────┤
│ ⚠ 2025년 2월 12일에 구독이          │
│   종료됩니다                        │
├─────────────────────────────────────┤
│ 잔여 횟수: 7/10 (종료일까지 사용가능)│
│ 사용 모델: Gemini 2.5 Pro           │
├─────────────────────────────────────┤
│ [취소 철회]                         │
└─────────────────────────────────────┘
```

---

## 12. API 명세

### 12.1 POST /api/subscription/cancel

**요청**:
```http
POST /api/subscription/cancel
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

**응답 (성공)**:
```json
{
  "success": true,
  "message": "구독 취소가 예약되었습니다",
  "data": {
    "cancel_at_period_end": true,
    "next_billing_date": "2025-02-12"
  }
}
```

**응답 (실패 - Free 플랜)**:
```json
{
  "success": false,
  "error": "취소할 구독이 없습니다",
  "code": "NO_SUBSCRIPTION"
}
```

**응답 (실패 - 이미 취소됨)**:
```json
{
  "success": false,
  "error": "이미 취소 예약되었습니다",
  "code": "ALREADY_CANCELLED"
}
```

---

### 12.2 POST /api/subscription/reactivate

**요청**:
```http
POST /api/subscription/reactivate
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

**응답 (성공)**:
```json
{
  "success": true,
  "message": "구독 취소가 철회되었습니다",
  "data": {
    "cancel_at_period_end": false,
    "next_billing_date": "2025-02-12"
  }
}
```

**응답 (실패 - 기간 만료)**:
```json
{
  "success": false,
  "error": "구독 기간이 만료되어 철회할 수 없습니다",
  "code": "PERIOD_EXPIRED"
}
```

**응답 (실패 - 취소 상태 아님)**:
```json
{
  "success": false,
  "error": "철회할 취소 예약이 없습니다",
  "code": "NOT_CANCELLED"
}
```

---

## 13. 테스트 시나리오

### 13.1 구독 취소 예약 테스트
1. Pro 구독자로 로그인
2. `/subscription` 페이지 접근
3. "구독 취소" 버튼 클릭
4. 확인 모달에서 안내 문구 확인
5. "취소하기" 버튼 클릭
6. 성공 메시지 확인
7. "취소 예정" 배지 표시 확인
8. "취소 철회" 버튼 표시 확인
9. Pro 서비스 계속 이용 가능 확인

### 13.2 취소 철회 테스트
1. 취소 예약 상태의 Pro 구독자로 로그인
2. `/subscription` 페이지 접근
3. "취소 철회" 버튼 클릭
4. 성공 메시지 확인
5. "취소 예정" 배지 제거 확인
6. "구독 취소" 버튼으로 복구 확인

### 13.3 구독 완전 해지 테스트 (Cron)
1. 테스트 구독 데이터 생성:
   - `cancel_at_period_end = true`
   - `next_billing_date = 오늘`
2. Cron 수동 실행 또는 대기
3. 빌링키 삭제 확인 (토스페이먼츠)
4. DB 구독 상태 확인:
   - `plan = 'free'`
   - `billing_key = NULL`
   - `remaining_tests = 0`
5. 사용자 로그인 후 Free 플랜 표시 확인

---

## 14. 참고 자료

### 14.1 관련 문서
- `/docs/requirement.md` - 구독 정책
- `/docs/prd.md` - 구독 관리 페이지 명세
- `/docs/userflow.md` - Flow 6, 7 (구독 취소 및 철회)
- `/docs/database.md` - subscriptions 테이블 스키마

### 14.2 외부 API
- [토스페이먼츠 빌링키 삭제 API](https://docs.tosspayments.com/reference#%EB%B9%8C%EB%A7%81%ED%82%A4-%EC%82%AD%EC%A0%9C)
- [Supabase Cron](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## 15. 개발 체크리스트

### 백엔드
- [ ] POST /api/subscription/cancel API 구현
- [ ] POST /api/subscription/reactivate API 구현
- [ ] Cron 처리 로직에 취소 예약 구독 해지 추가
- [ ] 빌링키 삭제 API 연동 (토스페이먼츠)
- [ ] 에러 핸들링 및 로깅
- [ ] API 테스트 작성

### 프론트엔드
- [ ] 구독 취소 버튼 및 확인 모달 구현
- [ ] 취소 철회 버튼 구현
- [ ] 취소 예약 상태 UI 표시
- [ ] 성공/에러 메시지 처리
- [ ] 상태별 버튼 조건부 렌더링

### 테스트
- [ ] 구독 취소 E2E 테스트
- [ ] 취소 철회 E2E 테스트
- [ ] Cron 해지 처리 테스트
- [ ] 엣지케이스 테스트 (Free 플랜, 중복 취소 등)

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**작성자**: Claude Code
**승인 대기 중**

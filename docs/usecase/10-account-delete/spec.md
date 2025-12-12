# 사용자 계정 삭제 유스케이스

**기능 번호**: 10
**기능명**: 사용자 계정 삭제
**우선순위**: P0 (필수)
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

사용자가 Clerk 프로필 관리 페이지에서 계정을 삭제하면, Clerk Webhook을 통해 Supabase의 사용자 데이터를 정리하고, Pro 구독 중인 경우 토스페이먼츠 빌링키를 삭제하는 기능입니다.

### 1.1 관련 문서
- `/docs/userflow.md` - 10. 사용자 계정 삭제
- `/docs/database.md` - 사용자 및 구독 데이터 구조
- `/docs/requirement.md` - Clerk Webhook 요구사항

### 1.2 관련 서비스
- **Clerk**: 계정 삭제 처리 및 `user.deleted` Webhook 전송
- **Supabase**: 사용자 관련 데이터 삭제/정리
- **토스페이먼츠**: 빌링키 삭제 API

---

## 2. 사용자 시나리오

### 2.1 주요 시나리오
**사용자**: Pro 구독 중인 김철수
**상황**: 서비스를 더 이상 이용하지 않기로 결정
**목표**: 계정 및 모든 개인정보 삭제

**플로우**:
1. 김철수가 Clerk 프로필 관리 페이지에서 "계정 삭제" 선택
2. Clerk 확인 모달에서 "계정 삭제" 확정
3. Clerk가 계정 삭제 처리 후 `user.deleted` Webhook 전송
4. Next.js API가 Webhook 수신 및 서명 검증
5. Supabase에서 김철수의 구독 정보 조회 (Pro 플랜 확인)
6. 토스페이먼츠 빌링키 삭제 API 호출
7. Supabase에서 검사 내역, 구독 정보, 사용자 정보 삭제
8. 김철수는 로그아웃 상태로 랜딩 페이지로 이동

### 2.2 대체 시나리오 1 (Free 플랜 사용자)
**사용자**: Free 플랜 사용자 이영희
**플로우**:
1. 이영희가 계정 삭제 선택
2. Clerk가 `user.deleted` Webhook 전송
3. Next.js API가 구독 정보 조회 (Free 플랜 확인)
4. 빌링키 삭제 없이 Supabase 데이터만 정리
5. 계정 삭제 완료

### 2.3 예외 시나리오 1 (빌링키 삭제 실패)
**상황**: 토스페이먼츠 API 일시적 장애
**처리**:
1. 빌링키 삭제 API 호출 실패
2. 에러 로그 기록 및 관리자 알림
3. 사용자 데이터는 정상 삭제 진행
4. 관리자가 수동으로 빌링키 정리

### 2.4 예외 시나리오 2 (Webhook 전송 실패)
**상황**: Clerk Webhook 전송 실패 (네트워크 오류 등)
**처리**:
1. Clerk가 자동 재시도 (최대 3회)
2. 재시도 성공 시 정상 처리
3. 재시도 실패 시 Supabase에 고아(orphan) 데이터 발생
4. 정기적인 데이터 정리 스크립트로 처리

---

## 3. 기능 요구사항

### 3.1 입력
- **Clerk Webhook 이벤트**: `user.deleted`
  - `clerk_user_id`: 삭제된 사용자의 Clerk ID
  - `email`: 사용자 이메일 (선택적)
  - Webhook 서명 (검증용)

### 3.2 처리 단계

#### 3.2.1 Webhook 검증
1. Clerk Webhook 서명 검증
2. `user.deleted` 이벤트 타입 확인
3. 유효하지 않은 요청은 즉시 거부 (401 Unauthorized)

#### 3.2.2 사용자 조회
1. Supabase `users` 테이블에서 `clerk_user_id`로 사용자 조회
2. 사용자가 없으면 200 OK 응답 (중복 요청 방지)

#### 3.2.3 구독 정보 확인
1. `subscriptions` 테이블에서 사용자 구독 정보 조회
2. Pro 플랜 여부 확인 (`plan = 'pro'` 및 `billing_key` 존재)

#### 3.2.4 빌링키 삭제 (Pro 플랜인 경우)
1. 토스페이먼츠 빌링키 삭제 API 호출
   - Endpoint: `DELETE /v1/billing/authorizations/billing-key/{billingKey}`
   - Authorization: `Basic {TOSS_SECRET_KEY}`
2. 성공 시 로그 기록
3. 실패 시:
   - 에러 로그 기록
   - 관리자 알림 전송 (이메일/Slack 등)
   - 처리 계속 진행 (사용자 데이터 삭제는 수행)

#### 3.2.5 데이터 정리
1. `tests` 테이블: 사용자 검사 내역 삭제
   - `DELETE FROM tests WHERE user_id = {user_id}`
   - 또는 익명화 처리 (법적 요구사항에 따라)
2. `subscriptions` 테이블: 구독 정보 삭제
   - `DELETE FROM subscriptions WHERE user_id = {user_id}`
3. `users` 테이블: 사용자 정보 삭제
   - `DELETE FROM users WHERE id = {user_id}`
   - CASCADE 옵션으로 자동 삭제도 가능

#### 3.2.6 완료 처리
1. 200 OK 응답 반환 (Clerk에게)
2. 처리 로그 기록

### 3.3 출력
- **Clerk에게**: 200 OK 응답 (성공)
- **사용자에게**:
  - Clerk 세션 종료
  - 랜딩 페이지로 리다이렉트
- **시스템 로그**:
  - 계정 삭제 완료 로그
  - 빌링키 삭제 성공/실패 로그

---

## 4. 데이터 명세

### 4.1 입력 데이터 (Clerk Webhook)
```json
{
  "type": "user.deleted",
  "data": {
    "id": "user_2abc123...",
    "email_addresses": [
      {
        "email_address": "user@example.com"
      }
    ]
  }
}
```

### 4.2 Supabase 쿼리

#### 4.2.1 사용자 조회
```sql
SELECT
  id,
  clerk_user_id,
  email
FROM users
WHERE clerk_user_id = $1;
```

#### 4.2.2 구독 정보 조회
```sql
SELECT
  plan,
  billing_key
FROM subscriptions
WHERE user_id = $1;
```

#### 4.2.3 데이터 삭제
```sql
-- ON DELETE CASCADE로 자동 삭제 가능
DELETE FROM users WHERE id = $1;

-- 또는 개별 삭제
DELETE FROM tests WHERE user_id = $1;
DELETE FROM subscriptions WHERE user_id = $1;
DELETE FROM users WHERE id = $1;
```

### 4.3 토스페이먼츠 API

#### 4.3.1 빌링키 삭제 요청
```http
DELETE /v1/billing/authorizations/billing-key/{billingKey} HTTP/1.1
Host: api.tosspayments.com
Authorization: Basic {Base64(TOSS_SECRET_KEY)}
```

#### 4.3.2 성공 응답
```http
HTTP/1.1 200 OK
```

#### 4.3.3 실패 응답 (예시)
```json
{
  "code": "NOT_FOUND_BILLING_KEY",
  "message": "존재하지 않는 빌링키입니다."
}
```

---

## 5. 비기능 요구사항

### 5.1 보안
- Clerk Webhook 서명 검증 필수
- Webhook Secret은 환경변수로 관리 (`CLERK_WEBHOOK_SECRET`)
- 토스페이먼츠 API 호출 시 Secret Key 안전하게 관리

### 5.2 성능
- Webhook 처리 시간 5초 이내 (토스 API 호출 포함)
- Clerk 재시도 고려하여 멱등성 보장

### 5.3 안정성
- 빌링키 삭제 실패 시에도 사용자 데이터 삭제는 진행
- 실패 로그를 통한 추적 및 수동 처리 지원

### 5.4 법적 준수
- GDPR, 개인정보보호법 준수
- 삭제 요청 시 즉시 처리
- 필요한 경우 결제 내역은 법적 보관 기간 동안 유지 가능

### 5.5 모니터링
- 계정 삭제 요청 수 추적
- 빌링키 삭제 실패 알림
- 고아 데이터 발생 감지

---

## 6. 엣지케이스 및 에러 처리

### 6.1 Webhook 서명 불일치
**원인**: 잘못된 요청 또는 Webhook Secret 불일치
**처리**: 401 Unauthorized 응답, 로그 기록

### 6.2 사용자 이미 삭제됨 (중복 Webhook)
**원인**: Clerk 재시도 또는 중복 호출
**처리**: 200 OK 응답 (멱등성 보장), "이미 삭제됨" 로그

### 6.3 Pro 구독 중 계정 삭제
**정책**: 환불 없음
**처리**:
- 남은 구독 기간에 대한 환불 없이 즉시 삭제
- 빌링키 삭제로 향후 자동결제 방지

### 6.4 빌링키 삭제 API 실패
**원인**: 토스페이먼츠 API 장애, 이미 삭제된 빌링키 등
**처리**:
- 에러 로그 기록
- 관리자 알림 (이메일/Slack)
- 사용자 데이터는 정상 삭제
- 관리자가 토스 대시보드에서 수동 확인/삭제

### 6.5 Webhook 전송 실패
**원인**: Next.js API 다운타임, 네트워크 오류
**처리**:
- Clerk 자동 재시도 (최대 3회)
- 재시도 실패 시 Supabase에 고아 데이터 발생
- 정기 스크립트로 고아 데이터 정리:
  - Clerk API로 사용자 존재 여부 확인
  - 존재하지 않으면 Supabase 데이터 삭제

### 6.6 Supabase 연결 실패
**원인**: DB 일시적 장애
**처리**:
- 500 Internal Server Error 응답
- Clerk가 자동 재시도
- 장애 복구 후 정상 처리

### 6.7 검사 내역 매우 많은 경우
**원인**: 수백/수천 건의 검사 내역
**처리**:
- ON DELETE CASCADE로 자동 처리
- 또는 배치 삭제 (100건씩)
- 타임아웃 방지를 위해 백그라운드 작업 고려

---

## 7. API 명세

### 7.1 Endpoint
```
POST /api/auth/webhook
```

### 7.2 Request Headers
```
svix-id: msg_xxx
svix-timestamp: 1234567890
svix-signature: v1,xxx
Content-Type: application/json
```

### 7.3 Request Body (user.deleted 이벤트)
```json
{
  "type": "user.deleted",
  "data": {
    "id": "user_2abc123...",
    "email_addresses": [
      {
        "email_address": "user@example.com"
      }
    ]
  }
}
```

### 7.4 Response

#### 7.4.1 성공 (200 OK)
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### 7.4.2 인증 실패 (401 Unauthorized)
```json
{
  "success": false,
  "error": "Invalid webhook signature"
}
```

#### 7.4.3 서버 오류 (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Failed to delete user data"
}
```

---

## 8. 테스트 시나리오

### 8.1 정상 플로우 테스트
1. Free 플랜 사용자 계정 삭제
   - Clerk에서 계정 삭제
   - Webhook 수신 확인
   - Supabase 데이터 삭제 확인
   - 빌링키 삭제 시도 없음 확인

2. Pro 플랜 사용자 계정 삭제
   - Clerk에서 계정 삭제
   - Webhook 수신 확인
   - 토스 빌링키 삭제 API 호출 확인
   - Supabase 데이터 삭제 확인

### 8.2 에러 처리 테스트
1. Webhook 서명 불일치
   - 잘못된 서명으로 요청 전송
   - 401 응답 확인

2. 빌링키 삭제 실패
   - 토스 API 모킹 (실패 응답)
   - 사용자 데이터는 정상 삭제 확인
   - 에러 로그 기록 확인

3. 중복 Webhook
   - 동일 사용자에 대해 Webhook 2회 전송
   - 첫 번째: 정상 삭제
   - 두 번째: 200 OK 응답, 추가 작업 없음

### 8.3 통합 테스트
1. 실제 Clerk 계정 생성
2. Pro 구독 등록
3. 계정 삭제 수행
4. 모든 데이터 삭제 확인

---

## 9. 운영 고려사항

### 9.1 모니터링 항목
- 계정 삭제 요청 수 (일별/월별)
- 빌링키 삭제 실패 건수
- Webhook 처리 시간
- 고아 데이터 발생 건수

### 9.2 알림 설정
- 빌링키 삭제 실패 시 관리자 이메일 전송
- Webhook 처리 실패 3회 이상 시 긴급 알림

### 9.3 정기 점검
- 주 1회: 고아 데이터 스크립트 실행
- 월 1회: 토스 대시보드에서 빌링키 상태 확인

### 9.4 복구 계획
- Webhook 실패로 인한 고아 데이터 발생 시:
  1. Clerk API로 사용자 목록 조회
  2. Supabase 사용자 목록과 비교
  3. Clerk에 없는 사용자 데이터 삭제
  4. 스크립트: `/scripts/cleanup-orphan-users.ts`

---

## 10. 참고 자료

### 10.1 외부 문서
- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
- [토스페이먼츠 빌링키 삭제 API](https://docs.tosspayments.com/reference/billing#%EB%B9%8C%EB%A7%81%ED%82%A4-%EC%82%AD%EC%A0%9C)

### 10.2 내부 문서
- `/docs/userflow.md` - 10. 사용자 계정 삭제
- `/docs/database.md` - 데이터베이스 스키마
- `/docs/external/fullstackIntegration.md` - Clerk 연동 가이드

---

## 11. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-12-12 | Claude Code | 최초 작성 |

---

**문서 작성 완료**
**검토 필요**: Product Owner, 개발팀 리드
**승인 상태**: 대기 중

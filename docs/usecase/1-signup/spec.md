# 유스케이스 1: 신규 사용자 회원가입 및 Free 플랜 부여

**프로젝트**: Saju피아 - AI 기반 사주팔자 분석 SaaS
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 개요

### 1.1 목적
신규 사용자가 Google OAuth를 통해 간편하게 회원가입하고, 자동으로 Free 플랜(3회 무료 검사)을 부여받는다.

### 1.2 관련 기능
- Google OAuth 인증 (Clerk)
- Webhook 기반 사용자 동기화
- Supabase 사용자 데이터 생성
- Free 플랜 초기 구독 설정

### 1.3 우선순위
P0 (필수)

---

## 2. 액터 (Actor)

### 2.1 Primary Actor
- **신규 사용자**: 서비스에 처음 가입하는 사용자

### 2.2 Secondary Actors
- **Clerk**: Google OAuth 인증 및 사용자 관리 서비스
- **Next.js API**: Webhook 수신 및 비즈니스 로직 처리
- **Supabase**: 사용자 데이터 저장

---

## 3. 전제조건 (Preconditions)

- 사용자가 Google 계정을 보유하고 있다
- Clerk에서 Google OAuth Provider가 활성화되어 있다
- Clerk Webhook이 Next.js API로 설정되어 있다 (배포 후)
- Supabase 데이터베이스에 `users`, `subscriptions` 테이블이 생성되어 있다

---

## 4. 후속조건 (Postconditions)

### 4.1 성공 시
- Clerk에 사용자 계정이 생성된다
- Supabase `users` 테이블에 사용자 레코드가 생성된다
- Supabase `subscriptions` 테이블에 Free 플랜 레코드가 생성된다
  - `plan`: 'free'
  - `remaining_tests`: 3
  - `max_tests`: 3
- 사용자가 로그인 상태로 `/dashboard`로 리다이렉트된다
- Global Nav에 잔여 횟수 "3/3"이 표시된다

### 4.2 실패 시
- 사용자가 로그인 페이지에 머물며 에러 메시지가 표시된다
- Supabase에 사용자 데이터가 생성되지 않는다

---

## 5. 정상 플로우 (Main Flow)

### 5.1 사용자 액션
1. 사용자가 랜딩 페이지(`/`)에 접속한다
2. "무료 시작하기" 또는 "시작하기" 버튼을 클릭한다
3. Clerk 로그인 모달이 표시된다
4. "Google로 로그인" 버튼을 클릭한다
5. Google OAuth 화면으로 이동한다
6. Google 계정을 선택하고 권한을 승인한다

### 5.2 시스템 처리
1. **Clerk 인증 처리**
   - Google OAuth 인증 프로세스 시작
   - 사용자 정보 수신 (이메일, 이름 등)
   - Clerk 사용자 계정 생성
   - 인증 토큰 및 세션 생성

2. **Clerk Webhook 전송**
   - Clerk가 `user.created` 이벤트를 Next.js API(`/api/auth/webhook`)로 전송
   - Webhook payload에 포함된 정보:
     - `clerk_user_id`: Clerk 고유 사용자 ID
     - `email_addresses`: 사용자 이메일 주소 배열
     - `created_at`: 생성 시간

3. **Webhook 검증 및 처리**
   - Next.js API가 Clerk Webhook 서명 검증 (`CLERK_WEBHOOK_SECRET` 사용)
   - 중복 가입 확인 (`clerk_user_id`로 조회)
   - Supabase Service Role Key를 사용하여 데이터 삽입 (RLS 우회)

4. **사용자 데이터 생성**
   ```sql
   INSERT INTO users (clerk_user_id, email, created_at, updated_at)
   VALUES ($1, $2, now(), now())
   RETURNING id;
   ```
   - `clerk_user_id`: Clerk에서 받은 고유 ID
   - `email`: 사용자 주 이메일 주소

5. **Free 플랜 구독 생성**
   ```sql
   INSERT INTO subscriptions (
     user_id,
     plan,
     remaining_tests,
     billing_key,
     next_billing_date,
     cancel_at_period_end,
     created_at,
     updated_at
   )
   VALUES ($1, 'free', 3, NULL, NULL, false, now(), now());
   ```
   - `user_id`: 생성된 사용자 ID
   - `plan`: 'free'
   - `remaining_tests`: 3 (무료 검사 횟수)
   - Pro 관련 필드(`billing_key`, `next_billing_date`)는 NULL

6. **응답 및 리다이렉트**
   - Webhook 핸들러가 200 OK 응답 반환
   - Clerk가 사용자를 `/dashboard` 페이지로 리다이렉트
   - Global Nav에 사용자 정보 표시:
     - 이메일 주소
     - 잔여 횟수: 3/3
     - 구독 플랜: Free

---

## 6. 예외 플로우 (Exception Flows)

### 6.1 Google OAuth 인증 취소
**Trigger**: 사용자가 Google 권한 승인 화면에서 "취소" 클릭

**처리**:
1. Clerk가 인증 실패 감지
2. 사용자를 로그인 모달로 되돌림
3. 에러 메시지 표시: "인증이 취소되었습니다"

**결과**: 계정 생성 없음, 랜딩 페이지 유지

---

### 6.2 이미 가입한 사용자의 재로그인
**Trigger**: 기존 사용자가 Google OAuth로 로그인 시도

**처리**:
1. Clerk가 기존 사용자 확인
2. 새로운 `user.created` Webhook 전송 안 함
3. 즉시 세션 생성 및 로그인 처리

**결과**:
- `/dashboard`로 리다이렉트
- 기존 검사 내역 표시
- 기존 구독 상태 유지

---

### 6.3 Clerk Webhook 전송 실패
**Trigger**: 네트워크 오류 또는 API 서버 다운

**처리**:
1. Clerk가 Webhook 전송 재시도 (최대 3회)
2. 지수 백오프 방식으로 재시도 간격 증가

**결과** (재시도 성공 시):
- 정상적으로 사용자 데이터 생성
- 사용자는 로그인 상태로 서비스 이용 가능

**결과** (모든 재시도 실패 시):
- Clerk에는 계정 생성됨
- Supabase에는 사용자 데이터 없음
- 사용자가 앱 접근 시 에러 페이지 표시
- 관리자에게 알림 전송 (모니터링 시스템)

---

### 6.4 Supabase 연결 실패
**Trigger**: Supabase 데이터베이스 다운타임 또는 연결 오류

**처리**:
1. Webhook 핸들러에서 데이터베이스 에러 캐치
2. 500 Internal Server Error 응답을 Clerk에 반환
3. 로그에 에러 기록 (Sentry 또는 Vercel Logs)

**결과**:
- Clerk가 Webhook 재시도
- 사용자에게 "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요" 메시지 표시
- 사용자는 로그인 모달에 유지

---

### 6.5 중복 Webhook 수신
**Trigger**: Clerk가 동일한 `user.created` 이벤트를 여러 번 전송 (네트워크 재시도)

**처리**:
1. Webhook 핸들러에서 `clerk_user_id`로 중복 확인
   ```typescript
   const existingUser = await supabase
     .from('users')
     .select('id')
     .eq('clerk_user_id', clerkUserId)
     .single();

   if (existingUser) {
     return res.status(200).json({ message: 'User already exists' });
   }
   ```
2. 이미 존재하면 스킵하고 200 OK 응답

**결과**:
- 중복 레코드 생성 방지
- Webhook 처리 성공으로 간주

---

### 6.6 Webhook 서명 검증 실패
**Trigger**: 비정상적인 요청 또는 잘못된 환경변수 설정

**처리**:
1. Webhook 핸들러에서 Clerk 서명 검증
   ```typescript
   const isValid = Webhook.verify(payload, headers, CLERK_WEBHOOK_SECRET);
   if (!isValid) {
     return res.status(401).json({ error: 'Invalid signature' });
   }
   ```
2. 401 Unauthorized 응답 반환
3. 로그에 비정상 접근 기록

**결과**:
- Webhook 처리 거부
- 관리자에게 보안 알림 (선택)

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

### 7.1 성능
- Webhook 처리 시간: 평균 2초 이내
- Google OAuth 인증 완료: 평균 5초 이내

### 7.2 보안
- Clerk Webhook 서명 검증 필수
- Supabase RLS(Row Level Security) 적용
- 환경변수로 비밀키 관리 (`.env.local`)

### 7.3 가용성
- Clerk Webhook 재시도 메커니즘 활용
- 데이터베이스 에러 발생 시 재시도 로직

### 7.4 확장성
- Webhook 핸들러는 Stateless 설계 (Vercel Edge Functions)
- Supabase Connection Pooling 활용

---

## 8. 데이터 명세

### 8.1 입력 데이터 (Webhook Payload)
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2XXX",
    "email_addresses": [
      {
        "email_address": "user@example.com",
        "id": "idn_XXX"
      }
    ],
    "created_at": 1670000000000
  }
}
```

### 8.2 출력 데이터 (Supabase)

**users 테이블**:
| 컬럼 | 타입 | 값 예시 |
|------|------|---------|
| id | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| clerk_user_id | TEXT | `user_2XXX` |
| email | TEXT | `user@example.com` |
| created_at | TIMESTAMPTZ | `2025-12-12 10:30:00+00` |
| updated_at | TIMESTAMPTZ | `2025-12-12 10:30:00+00` |

**subscriptions 테이블**:
| 컬럼 | 타입 | 값 예시 |
|------|------|---------|
| id | UUID | `660e8400-e29b-41d4-a716-446655440000` |
| user_id | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| plan | ENUM | `free` |
| remaining_tests | INTEGER | `3` |
| billing_key | TEXT | `NULL` |
| next_billing_date | DATE | `NULL` |
| cancel_at_period_end | BOOLEAN | `false` |
| created_at | TIMESTAMPTZ | `2025-12-12 10:30:00+00` |
| updated_at | TIMESTAMPTZ | `2025-12-12 10:30:00+00` |

---

## 9. 외부 연동 명세

### 9.1 Clerk
- **API**: Webhook (`user.created`)
- **환경변수**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
- **참고**: [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)

### 9.2 Supabase
- **API**: JavaScript Client + Service Role Key
- **환경변수**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **참고**: `/docs/database.md`

---

## 10. UI/UX 요구사항

### 10.1 랜딩 페이지
- "무료 시작하기" 버튼: Primary 스타일, 눈에 잘 띄는 색상
- "시작하기" 버튼 (헤더): Secondary 스타일

### 10.2 Clerk 로그인 모달
- Clerk 기본 UI 사용
- Google OAuth 버튼 강조

### 10.3 대시보드 (가입 완료 후)
- 환영 메시지: "Saju피아에 오신 것을 환영합니다!" (첫 로그인 시)
- 빈 상태 UI: "아직 검사 내역이 없습니다. 새 검사를 시작해보세요!"
- Global Nav 하단:
  - 이메일: `user@example.com`
  - 잔여 횟수: 3/3
  - 구독: Free

---

## 11. 테스트 시나리오

### 11.1 정상 케이스
1. 신규 사용자가 Google 계정으로 가입
2. Clerk Webhook이 정상 전송됨
3. Supabase에 사용자 및 구독 데이터 생성됨
4. 대시보드 페이지로 이동 및 3/3 횟수 표시 확인

### 11.2 예외 케이스
1. Google OAuth 취소 → 에러 메시지 확인
2. 기존 사용자 재로그인 → 기존 데이터 유지 확인
3. Webhook 중복 수신 → 중복 레코드 미생성 확인
4. Supabase 연결 실패 → 재시도 및 에러 메시지 확인

---

## 12. 모니터링 및 로깅

### 12.1 로그 항목
- Webhook 수신 시간 및 payload
- 사용자 생성 성공/실패 여부
- 구독 생성 성공/실패 여부
- 에러 스택 트레이스 (실패 시)

### 12.2 알림 설정
- Webhook 처리 실패 3회 연속 시 관리자 이메일 알림
- Supabase 연결 오류 시 Slack 알림

---

## 13. 참고 문서

- `/docs/userflow.md` - 섹션 1: 신규 사용자 회원가입 및 Free 플랜 부여
- `/docs/database.md` - users, subscriptions 테이블 스키마
- `/docs/prd.md` - 섹션 6.1: 인증 기능 (Clerk)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**작성자**: Claude Code
**승인자**: Product Owner
**최종 검토일**: 2025-12-12

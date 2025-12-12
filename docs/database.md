# Saju피아 데이터베이스 설계

**프로젝트**: Saju피아 - AI 기반 사주팔자 분석 SaaS
**데이터베이스**: PostgreSQL (Supabase)
**작성일**: 2025-12-12
**버전**: 2.0

---

## 설계 철학

1. 유저플로우에 명시된 데이터만 저장
2. 중복 데이터 최소화
3. 비즈니스 로직은 애플리케이션 레이어에서 처리
4. PostgreSQL 기본 기능 최대 활용

---

## 1. 데이터 플로우

### 1.1 신규 가입
```
Clerk Webhook (user.created)
  → users INSERT (clerk_user_id, email)
  → subscriptions INSERT (user_id, plan='free', remaining_tests=3)
```

### 1.2 사주 검사
```
사용자 입력 (이름, 생년월일, 출생시간, 성별)
  → subscriptions SELECT (remaining_tests > 0 확인)
  → tests INSERT (user_id, name, birth_date, birth_time, gender)
  → Gemini API 호출
  → tests UPDATE (analysis_result)
  → subscriptions UPDATE (remaining_tests -= 1)
```

### 1.3 Pro 구독 시작
```
토스페이먼츠 빌링키 발급 + 첫 결제(3900원)
  → subscriptions UPDATE
      (plan='pro', billing_key, next_billing_date=오늘+1개월, remaining_tests=10)
```

### 1.4 구독 취소 예약
```
사용자 취소 요청
  → subscriptions UPDATE (cancel_at_period_end=true)
  → 다음 결제일까지 서비스 유지
```

### 1.5 구독 취소 철회
```
사용자 철회 요청 (next_billing_date 이전)
  → subscriptions UPDATE (cancel_at_period_end=false)
```

### 1.6 정기 결제 (Supabase Cron 매일 02:00)
```
next_billing_date = 오늘인 구독 조회
  ├─ 결제 성공
  │   → subscriptions UPDATE (remaining_tests=10, next_billing_date=오늘+1개월)
  │
  └─ 결제 실패
      → 토스 빌링키 삭제
      → subscriptions UPDATE (plan='free', billing_key=NULL, remaining_tests=0)
```

### 1.7 구독 만료 (취소 예약된 경우)
```
next_billing_date = 오늘 & cancel_at_period_end=true
  → 토스 빌링키 삭제
  → subscriptions UPDATE (plan='free', billing_key=NULL, remaining_tests=0, cancel_at_period_end=false)
```

---

## 2. 데이터베이스 스키마

### 2.1 users (사용자)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_clerk_id ON users(clerk_user_id);
```

### 2.2 subscriptions (구독)
```sql
CREATE TYPE plan_type AS ENUM ('free', 'pro');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 구독 정보
  plan plan_type NOT NULL DEFAULT 'free',
  remaining_tests INTEGER NOT NULL DEFAULT 3,

  -- Pro 플랜 전용 (NULL 가능)
  billing_key TEXT,
  next_billing_date DATE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 제약 조건
  CONSTRAINT chk_remaining_tests CHECK (remaining_tests >= 0),
  CONSTRAINT chk_pro_billing_key CHECK (
    (plan = 'pro' AND billing_key IS NOT NULL AND next_billing_date IS NOT NULL)
    OR plan = 'free'
  )
);

CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date)
  WHERE plan = 'pro' AND cancel_at_period_end = false;
```

**핵심 변경점**:
- `max_tests` 제거 (plan에 따라 애플리케이션에서 결정)
- `status` ENUM 제거 (불필요한 복잡성)
- `current_period_start` 제거 (next_billing_date만으로 충분)
- Pro 관련 필드는 NULL 허용으로 간결화
- Partial Index로 Cron 쿼리 최적화

### 2.3 tests (사주 검사 내역)
```sql
CREATE TYPE gender_type AS ENUM ('male', 'female');

CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 검사 대상자 정보
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  gender gender_type NOT NULL,

  -- AI 분석 결과
  analysis_result TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_birth_date CHECK (birth_date <= CURRENT_DATE)
);

CREATE INDEX idx_tests_user_id_created ON tests(user_id, created_at DESC);
CREATE INDEX idx_tests_name ON tests(name);
```

**핵심 변경점**:
- `model_used` 제거 (analysis_result에 포함 가능하거나 추론 가능)
- `updated_at` 제거 (검사 결과는 수정되지 않음)
- 복합 인덱스로 대시보드 쿼리 최적화

---

## 3. Row Level Security (RLS)

Supabase에서 Clerk 연동 시 JWT 토큰의 `sub` claim을 사용합니다.

```sql
-- users 테이블
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- subscriptions 테이블
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_policy ON subscriptions
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- tests 테이블
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tests_policy ON tests
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
```

**핵심 변경점**:
- Clerk JWT 토큰의 `sub` claim 활용
- Service Role Key 사용 시 RLS bypass 가능

---

## 4. 트리거

```sql
-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. Supabase Cron

```sql
-- 매일 02:00 정기결제 처리
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

---

## 6. 주요 쿼리

### 6.1 오늘 결제할 Pro 구독 조회
```sql
SELECT
  s.id,
  s.user_id,
  s.billing_key,
  u.email
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.next_billing_date = CURRENT_DATE
  AND s.plan = 'pro'
  AND s.cancel_at_period_end = false;
```

### 6.2 사용자 검사 내역 조회 (최신순 20개)
```sql
SELECT
  id,
  name,
  birth_date,
  birth_time,
  gender,
  created_at
FROM tests
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

### 6.3 이름 검색
```sql
SELECT
  id,
  name,
  birth_date,
  created_at
FROM tests
WHERE user_id = $1
  AND name ILIKE '%' || $2 || '%'
ORDER BY created_at DESC;
```

### 6.4 구독 정보 조회
```sql
SELECT
  plan,
  remaining_tests,
  billing_key IS NOT NULL AS has_billing_key,
  next_billing_date,
  cancel_at_period_end
FROM subscriptions
WHERE user_id = $1;
```

### 6.5 Pro 구독 시작
```sql
UPDATE subscriptions
SET
  plan = 'pro',
  billing_key = $2,
  next_billing_date = CURRENT_DATE + INTERVAL '1 month',
  remaining_tests = 10,
  cancel_at_period_end = false
WHERE user_id = $1;
```

### 6.6 검사 횟수 차감
```sql
UPDATE subscriptions
SET remaining_tests = remaining_tests - 1
WHERE user_id = $1
  AND remaining_tests > 0
RETURNING remaining_tests;
```

### 6.7 정기결제 성공 처리
```sql
UPDATE subscriptions
SET
  remaining_tests = 10,
  next_billing_date = next_billing_date + INTERVAL '1 month'
WHERE id = $1;
```

### 6.8 정기결제 실패 처리
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

---

## 7. 애플리케이션 레이어 비즈니스 로직

데이터베이스를 간결하게 유지하기 위해 다음 로직은 애플리케이션에서 처리:

1. **max_tests 결정**
   ```typescript
   const MAX_TESTS = {
     free: 3,
     pro: 10
   };
   ```

2. **사용 모델 결정**
   ```typescript
   const GEMINI_MODEL = {
     free: 'gemini-2.5-flash',
     pro: 'gemini-2.5-pro'
   };
   ```

3. **결제 금액**
   ```typescript
   const PRO_PRICE = 3900; // 원
   ```

---

## 8. 보안 고려사항

### 8.1 빌링키 암호화
Supabase에서는 `billing_key`를 암호화하여 저장하는 것을 권장합니다.

**옵션 1: Supabase Vault (권장)**
```sql
-- billing_key를 Vault에 저장
SELECT vault.create_secret('billing_key_' || subscription_id, actual_billing_key);

-- 조회
SELECT vault.decrypted_secret('billing_key_' || subscription_id);
```

**옵션 2: 애플리케이션 레벨 암호화**
토스페이먼츠 빌링키를 저장 전 AES-256으로 암호화

### 8.2 환경변수
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# Gemini
GEMINI_API_KEY=

# Cron
CRON_SECRET=
```

---

## 9. 마이그레이션 스크립트

```sql
-- 1. ENUM 타입 생성
CREATE TYPE plan_type AS ENUM ('free', 'pro');
CREATE TYPE gender_type AS ENUM ('male', 'female');

-- 2. 테이블 생성
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan plan_type NOT NULL DEFAULT 'free',
  remaining_tests INTEGER NOT NULL DEFAULT 3,
  billing_key TEXT,
  next_billing_date DATE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_remaining_tests CHECK (remaining_tests >= 0),
  CONSTRAINT chk_pro_billing_key CHECK (
    (plan = 'pro' AND billing_key IS NOT NULL AND next_billing_date IS NOT NULL)
    OR plan = 'free'
  )
);

CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  gender gender_type NOT NULL,
  analysis_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_birth_date CHECK (birth_date <= CURRENT_DATE)
);

-- 3. 인덱스 생성
CREATE UNIQUE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date)
  WHERE plan = 'pro' AND cancel_at_period_end = false;
CREATE INDEX idx_tests_user_id_created ON tests(user_id, created_at DESC);
CREATE INDEX idx_tests_name ON tests(name);

-- 4. 트리거 생성
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY subscriptions_policy ON subscriptions
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY tests_policy ON tests
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
```

---

## 10. 체크리스트

### 필수
- [ ] Supabase 프로젝트 생성
- [ ] 마이그레이션 스크립트 실행
- [ ] RLS 정책 테스트
- [ ] Cron Job 설정
- [ ] 환경변수 설정
- [ ] Clerk JWT 통합 확인

### 권장
- [ ] 빌링키 암호화 (Vault)
- [ ] 백업 설정 (Point-in-Time Recovery)
- [ ] 모니터링 설정 (Supabase Dashboard)

---

## 11. 이전 설계 대비 개선사항

### 제거된 불필요한 요소
1. `subscriptions.status` ENUM (cancelled, expired, deleted 상태 제거)
2. `subscriptions.max_tests` (중복 데이터)
3. `subscriptions.current_period_start` (next_billing_date로 충분)
4. `tests.model_used` (plan으로 추론 가능)
5. `tests.updated_at` (검사는 수정되지 않음)
6. `payments` 테이블 (요구사항에 명시 없음, 필요시 추가 가능)

### 추가된 최적화
1. Partial Index (Cron 쿼리 최적화)
2. 복합 인덱스 (대시보드 쿼리 최적화)
3. 간결한 제약 조건 (Pro 플랜 검증)
4. 명확한 RLS 정책 (Clerk JWT 통합)

### 결과
- 테이블 수: 4개 → 3개
- 컬럼 수: 33개 → 24개 (27% 감소)
- ENUM 타입: 5개 → 2개
- 더 명확한 비즈니스 로직 분리

---

**문서 버전**: 2.0
**작성일**: 2025-12-12
**작성자**: CTO


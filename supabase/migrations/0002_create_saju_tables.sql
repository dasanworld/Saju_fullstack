-- =============================================================================
-- Saju피아 데이터베이스 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 전체 스크립트 실행
-- 버전: 1.0
-- 작성일: 2025-12-12
-- =============================================================================

-- pgcrypto 확장 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUM 타입 생성
-- =============================================================================

-- plan_type: 구독 플랜 타입
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE plan_type AS ENUM ('free', 'pro');
  END IF;
END $$;

-- gender_type: 성별 타입
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE gender_type AS ENUM ('male', 'female');
  END IF;
END $$;

-- =============================================================================
-- 2. users 테이블 (사용자)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_user_id);

-- RLS 비활성화 (Service Role Key 사용)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.users IS 'Clerk 인증 사용자 정보';
COMMENT ON COLUMN public.users.clerk_user_id IS 'Clerk에서 제공하는 고유 사용자 ID';
COMMENT ON COLUMN public.users.email IS '사용자 이메일 주소';

-- =============================================================================
-- 3. subscriptions 테이블 (구독)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

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
  CONSTRAINT chk_remaining_tests CHECK (remaining_tests >= 0)
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Partial Index: Cron 작업에서 결제 대상 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
  ON public.subscriptions(next_billing_date)
  WHERE plan = 'pro' AND cancel_at_period_end = false;

-- RLS 비활성화 (Service Role Key 사용)
ALTER TABLE IF EXISTS public.subscriptions DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.subscriptions IS '사용자 구독 정보';
COMMENT ON COLUMN public.subscriptions.plan IS 'free: 무료 플랜 (3회), pro: 유료 플랜 (10회/월)';
COMMENT ON COLUMN public.subscriptions.remaining_tests IS '남은 검사 횟수';
COMMENT ON COLUMN public.subscriptions.billing_key IS '토스페이먼츠 빌링키 (Pro 전용)';
COMMENT ON COLUMN public.subscriptions.next_billing_date IS '다음 결제일 (Pro 전용)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS '결제일에 구독 취소 예정 여부';

-- =============================================================================
-- 4. tests 테이블 (사주 검사 내역)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 검사 대상자 정보
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  gender gender_type NOT NULL,

  -- AI 분석 결과
  analysis_result TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 제약 조건
  CONSTRAINT chk_birth_date CHECK (birth_date <= CURRENT_DATE)
);

-- 복합 인덱스: 대시보드 검사 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tests_user_created
  ON public.tests(user_id, created_at DESC);

-- 인덱스: 이름 검색
CREATE INDEX IF NOT EXISTS idx_tests_name ON public.tests(name);

-- RLS 비활성화 (Service Role Key 사용)
ALTER TABLE IF EXISTS public.tests DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tests IS '사주 검사 내역';
COMMENT ON COLUMN public.tests.name IS '검사 대상자 이름';
COMMENT ON COLUMN public.tests.birth_date IS '생년월일';
COMMENT ON COLUMN public.tests.birth_time IS '출생 시간 (모를 경우 NULL)';
COMMENT ON COLUMN public.tests.gender IS '성별 (male/female)';
COMMENT ON COLUMN public.tests.analysis_result IS 'Gemini AI 분석 결과 (마크다운)';

-- =============================================================================
-- 5. updated_at 자동 갱신 트리거
-- =============================================================================

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블 트리거
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- subscriptions 테이블 트리거
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 6. 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Saju피아 데이터베이스 마이그레이션 완료!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - public.users (사용자)';
  RAISE NOTICE '  - public.subscriptions (구독)';
  RAISE NOTICE '  - public.tests (검사 내역)';
  RAISE NOTICE '==============================================';
END $$;

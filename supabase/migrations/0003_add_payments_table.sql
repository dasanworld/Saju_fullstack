-- =============================================================================
-- Payments 테이블 및 Subscriptions 확장 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 전체 스크립트 실행
-- 버전: 1.0
-- 작성일: 2025-12-12
-- =============================================================================

-- =============================================================================
-- 1. subscription_status ENUM 타입 생성
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'inactive');
  END IF;
END $$;

-- =============================================================================
-- 2. subscriptions 테이블에 컬럼 추가
-- =============================================================================

-- status 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN status subscription_status NOT NULL DEFAULT 'inactive';
  END IF;
END $$;

-- current_period_start 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN current_period_start TIMESTAMPTZ;
  END IF;
END $$;

-- current_period_end 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.subscriptions.status IS '구독 상태 (active: 활성, canceled: 취소됨, past_due: 결제 실패, inactive: 비활성)';
COMMENT ON COLUMN public.subscriptions.current_period_start IS '현재 결제 기간 시작일';
COMMENT ON COLUMN public.subscriptions.current_period_end IS '현재 결제 기간 종료일';

-- =============================================================================
-- 3. payments 테이블 생성 (결제 내역)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 토스페이먼츠 결제 정보
  payment_key TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  method TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 제약 조건
  CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_key ON public.payments(payment_key);

-- RLS 비활성화 (Service Role Key 사용)
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.payments IS '결제 내역';
COMMENT ON COLUMN public.payments.payment_key IS '토스페이먼츠 결제 키';
COMMENT ON COLUMN public.payments.order_id IS '주문 ID';
COMMENT ON COLUMN public.payments.amount IS '결제 금액';
COMMENT ON COLUMN public.payments.status IS '결제 상태 (DONE, CANCELED 등)';
COMMENT ON COLUMN public.payments.method IS '결제 수단 (카드, 계좌이체 등)';
COMMENT ON COLUMN public.payments.approved_at IS '결제 승인 시간';

-- =============================================================================
-- 4. 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Payments 마이그레이션 완료!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - public.subscriptions에 status, current_period_start, current_period_end 컬럼 추가';
  RAISE NOTICE '  - public.payments 테이블 생성';
  RAISE NOTICE '==============================================';
END $$;

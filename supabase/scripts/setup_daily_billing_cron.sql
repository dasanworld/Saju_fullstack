-- ============================================
-- Supabase pg_cron 정기결제 설정 스크립트
-- ============================================
--
-- 사용법:
-- 1. 아래 변수들을 실제 값으로 교체
-- 2. Supabase Dashboard > SQL Editor에서 실행
--
-- ============================================

-- [설정 변수] 아래 값들을 실제 값으로 교체하세요
-- YOUR_DOMAIN: Vercel 배포 도메인 (예: saju-fullstack.vercel.app)
-- YOUR_CRON_SECRET: .env.local의 CRON_SECRET 값

-- ============================================
-- Step 1: 확장 활성화 (이미 되어있으면 스킵)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- Step 2: 기존 job 삭제 (있으면)
-- ============================================
DO $$
BEGIN
  PERFORM cron.unschedule('daily-billing-job');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================
-- Step 3: daily-billing cron job 등록
-- 매일 17:00 UTC = 02:00 KST (다음날)
-- ============================================
SELECT cron.schedule(
  'daily-billing-job',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://saju-fullstack.vercel.app/api/cron/daily-billing',
    headers := '{
      "Content-Type": "application/json",
      "Authorization": "Bearer efe52a907659aa101f34af03777d7398180e9f9ca4103759276a8e7e30239185"
    }'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- Step 4: 등록 확인
-- ============================================
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'daily-billing-job';

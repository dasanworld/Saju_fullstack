-- ============================================
-- Supabase pg_cron + pg_net 설정
-- 매일 02:00 KST (17:00 UTC 전날)에 정기결제 실행
-- ============================================

-- 1. 필요한 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 중요: 아래 SQL은 Supabase Dashboard > SQL Editor에서
-- 실제 값을 대입하여 별도 실행해야 합니다.
-- ============================================

-- 2. 기존 cron job이 있으면 삭제 (중복 방지)
-- DO $$
-- BEGIN
--   PERFORM cron.unschedule('daily-billing-job');
-- EXCEPTION WHEN OTHERS THEN
--   NULL;
-- END $$;

-- 3. daily-billing cron job 등록
-- 매일 17:00 UTC = 02:00 KST (다음날)
-- 실제 URL과 SECRET을 대입하여 실행하세요:
--
-- SELECT cron.schedule(
--   'daily-billing-job',
--   '0 17 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_DOMAIN.vercel.app/api/cron/daily-billing',
--     headers := '{
--       "Content-Type": "application/json",
--       "Authorization": "Bearer YOUR_CRON_SECRET_HERE"
--     }'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- cron job 관리 명령어
-- ============================================
-- 등록된 job 확인:
-- SELECT * FROM cron.job;
--
-- 실행 기록 확인:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- job 삭제:
-- SELECT cron.unschedule('daily-billing-job');
--
-- ============================================

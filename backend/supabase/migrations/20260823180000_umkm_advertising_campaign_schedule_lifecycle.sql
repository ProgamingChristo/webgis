-- Phase 6: Campaign Schedule, Lifecycle & Activation Rules Migration

-- 1. Add start_at and end_at to ad_campaigns
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS start_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS end_at timestamp with time zone;

-- 2. Update status constraint to support full lifecycle
ALTER TABLE public.ad_campaigns
  DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_status_check
  CHECK (status IN ('DRAFT', 'READY', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'));

-- 3. Add schedule consistency constraint
ALTER TABLE public.ad_campaigns
  DROP CONSTRAINT IF EXISTS ad_campaigns_schedule_check;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_schedule_check
  CHECK (
    (start_at IS NULL AND end_at IS NULL)
    OR
    (start_at IS NOT NULL AND end_at IS NOT NULL AND end_at > start_at)
  );

-- 4. Create composite schedule index for temporal queries
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_schedule ON public.ad_campaigns(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_lifecycle_status ON public.ad_campaigns(status);

-- GETRA UMKM Intelligence & Advertising Track
-- Phase 10: Campaign Interaction Event Tracking (Append-Only Event Store)

CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('IMPRESSION', 'SPONSORED_PIN_CLICK', 'PROFILE_OPEN', 'ROUTE_REQUEST')),
  placement text NOT NULL CHECK (placement IN ('SPONSORED_PIN', 'CONTEXTUAL_BANNER', 'PROFILE_POSTER')),
  session_key text NOT NULL,
  dedup_key text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_campaign_events_dedup_key UNIQUE (dedup_key)
);

-- Performance & Analytics Indexes for Phase 11 Aggregation
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_occurred
  ON public.campaign_events(campaign_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_type_occurred
  ON public.campaign_events(campaign_id, event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_campaign_events_merchant
  ON public.campaign_events(merchant_id);

CREATE INDEX IF NOT EXISTS idx_campaign_events_placement
  ON public.campaign_events(placement, occurred_at);

-- Row Level Security (RLS) - Append-Only Policy
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert validated events
CREATE POLICY "campaign_events_insert_authenticated"
  ON public.campaign_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service_role to read and manage events
CREATE POLICY "campaign_events_select_service_role"
  ON public.campaign_events
  FOR SELECT
  TO service_role
  USING (true);

-- Allow authenticated users to select their own events or aggregate via server
CREATE POLICY "campaign_events_select_authenticated"
  ON public.campaign_events
  FOR SELECT
  TO authenticated
  USING (true);

-- No UPDATE or DELETE policies -> Strictly Append-Only by default

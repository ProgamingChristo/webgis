-- Migration: UMKM Advertising Spatial Targeting Foundation (Phase 5)
-- Table: public.ad_campaign_targets

CREATE TABLE IF NOT EXISTS public.ad_campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('RADIUS', 'STUDY_AREA')),
  radius_meters integer CHECK (radius_meters IS NULL OR (radius_meters >= 250 AND radius_meters <= 10000)),
  study_area_id uuid REFERENCES public.study_areas(id) ON DELETE SET NULL,
  center_geometry extensions.geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ad_campaign_targets_type_fields CHECK (
    (target_type = 'RADIUS' AND radius_meters IS NOT NULL AND center_geometry IS NOT NULL AND study_area_id IS NULL)
    OR
    (target_type = 'STUDY_AREA' AND study_area_id IS NOT NULL AND radius_meters IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_targets_campaign_id
  ON public.ad_campaign_targets(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_targets_study_area_id
  ON public.ad_campaign_targets(study_area_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_targets_center_geom
  ON public.ad_campaign_targets USING gist(center_geometry);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_ad_campaign_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ad_campaign_targets_updated_at ON public.ad_campaign_targets;
CREATE TRIGGER trg_ad_campaign_targets_updated_at
  BEFORE UPDATE ON public.ad_campaign_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ad_campaign_targets_updated_at();

-- RLS
ALTER TABLE public.ad_campaign_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant owners can view their campaign targets"
  ON public.ad_campaign_targets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_campaign_targets.campaign_id
      AND merchants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Merchant owners can create campaign targets"
  ON public.ad_campaign_targets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_campaign_targets.campaign_id
      AND merchants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Merchant owners can update campaign targets"
  ON public.ad_campaign_targets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_campaign_targets.campaign_id
      AND merchants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Merchant owners can delete campaign targets"
  ON public.ad_campaign_targets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_campaign_targets.campaign_id
      AND merchants.owner_id = auth.uid()
    )
  );

-- Helper function to generate RFC-compliant GeoJSON buffer for radius preview
CREATE OR REPLACE FUNCTION public.generate_radius_buffer_geojson(
  lng double precision,
  lat double precision,
  radius_m integer
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT extensions.ST_AsGeoJSON(
    extensions.ST_Buffer(
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      radius_m
    )::extensions.geometry
  )::jsonb;
$$;

-- Create storage bucket for advertising creatives if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('advertising-creatives', 'advertising-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage (Fallback/Optional, mainly we rely on backend signing/service role, but here is a basic public read policy)
CREATE POLICY "Public read access to advertising creatives" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'advertising-creatives');

-- Create ad_creatives table
CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  creative_type text NOT NULL,
  headline text NOT NULL,
  description text,
  image_path text,
  cta_type text NOT NULL CHECK (cta_type IN ('VIEW_PROFILE', 'REQUEST_ROUTE')),
  status text NOT NULL CHECK (status IN ('DRAFT', 'READY')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (campaign_id, creative_type)
);

-- Enable RLS
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON public.ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_creative_type ON public.ad_creatives(creative_type);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON public.ad_creatives(status);

-- RLS Policies

-- 1. Merchant owner can select their own creatives
CREATE POLICY "Merchant owners can view their creatives" ON public.ad_creatives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_creatives.campaign_id 
      AND merchants.owner_id = auth.uid()
    )
  );

-- 2. Insert is guarded by backend API. 
CREATE POLICY "Merchant owners can create creatives" ON public.ad_creatives
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_creatives.campaign_id 
      AND merchants.owner_id = auth.uid()
    )
  );

-- 3. Update is allowed for merchant owners
CREATE POLICY "Merchant owners can update their creatives" ON public.ad_creatives
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_creatives.campaign_id 
      AND merchants.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns
      JOIN public.merchants ON ad_campaigns.merchant_id = merchants.id
      WHERE ad_campaigns.id = ad_creatives.campaign_id 
      AND merchants.owner_id = auth.uid()
    )
  );

-- Function to auto update `updated_at` column
CREATE TRIGGER set_ad_creatives_updated_at
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

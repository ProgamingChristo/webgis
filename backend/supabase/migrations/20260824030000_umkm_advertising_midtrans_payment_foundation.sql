-- Migration: 20260824030000_umkm_advertising_midtrans_payment_foundation.sql
-- Description: Foundation schema for Midtrans Sandbox payment orders in UMKM Advertising

CREATE TABLE IF NOT EXISTS public.ad_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
    provider TEXT NOT NULL DEFAULT 'MIDTRANS',
    provider_transaction_id TEXT,
    provider_transaction_status TEXT,
    payment_type TEXT,
    fraud_status TEXT,
    snap_token TEXT,
    snap_redirect_url TEXT,
    paid_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_ad_payment_orders_campaign_id ON public.ad_payment_orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_payment_orders_order_id ON public.ad_payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_ad_payment_orders_status ON public.ad_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_ad_payment_orders_provider_tx_id ON public.ad_payment_orders(provider_transaction_id);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION public.set_ad_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ad_payment_orders_updated_at ON public.ad_payment_orders;
CREATE TRIGGER trigger_set_ad_payment_orders_updated_at
    BEFORE UPDATE ON public.ad_payment_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_ad_payment_orders_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.ad_payment_orders ENABLE ROW LEVEL SECURITY;

-- 1. Users can select payment orders for campaigns they created/own, or admins can view all
CREATE POLICY "ad_payment_orders_select_policy" ON public.ad_payment_orders
    FOR SELECT
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.account_role = 'ADMIN'
        )
    );

-- 2. Server-side / Admin policy for inserting and updating
CREATE POLICY "ad_payment_orders_insert_policy" ON public.ad_payment_orders
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.account_role = 'ADMIN'
        )
    );

CREATE POLICY "ad_payment_orders_update_policy" ON public.ad_payment_orders
    FOR UPDATE
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.account_role = 'ADMIN'
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.ad_payment_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_payment_orders TO service_role;

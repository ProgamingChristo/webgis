-- Owner-only soft deletion for published canonical merchants.
-- Historical submissions, claims, campaigns, evidence, and audit rows stay intact.
CREATE OR REPLACE FUNCTION public.archive_owned_merchant(p_merchant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
  merchant_owner_id uuid;
  current_publish_status public.publish_status;
  blocking_campaigns_count integer := 0;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id, publish_status
  INTO merchant_owner_id, current_publish_status
  FROM public.merchants
  WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'merchant_id', p_merchant_id,
      'status', 'NOT_FOUND',
      'blocking_campaigns_count', 0
    );
  END IF;

  IF merchant_owner_id IS DISTINCT FROM caller_id THEN
    RETURN jsonb_build_object(
      'merchant_id', p_merchant_id,
      'status', 'FORBIDDEN',
      'blocking_campaigns_count', 0
    );
  END IF;

  IF current_publish_status = 'ARCHIVED'::public.publish_status THEN
    RETURN jsonb_build_object(
      'merchant_id', p_merchant_id,
      'status', 'ALREADY_ARCHIVED',
      'blocking_campaigns_count', 0
    );
  END IF;

  SELECT count(*)::integer
  INTO blocking_campaigns_count
  FROM public.ad_campaigns
  WHERE merchant_id = p_merchant_id
    AND status IN ('READY', 'SCHEDULED', 'ACTIVE', 'PAUSED');

  IF blocking_campaigns_count > 0 THEN
    RETURN jsonb_build_object(
      'merchant_id', p_merchant_id,
      'status', 'ACTIVE_CAMPAIGNS',
      'blocking_campaigns_count', blocking_campaigns_count
    );
  END IF;

  UPDATE public.merchants
  SET publish_status = 'ARCHIVED'::public.publish_status,
      updated_at = now()
  WHERE id = p_merchant_id;

  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES (
    'MERCHANT_ARCHIVED_BY_OWNER',
    caller_id,
    'merchant',
    p_merchant_id,
    jsonb_build_object('previous_publish_status', current_publish_status)
  );

  RETURN jsonb_build_object(
    'merchant_id', p_merchant_id,
    'status', 'ARCHIVED',
    'blocking_campaigns_count', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_owned_merchant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_owned_merchant(uuid) TO authenticated;

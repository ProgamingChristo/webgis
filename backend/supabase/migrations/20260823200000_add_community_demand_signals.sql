CREATE TABLE IF NOT EXISTS public.commuter_request_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregation_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  grid_longitude DOUBLE PRECISION NOT NULL,
  grid_latitude DOUBLE PRECISION NOT NULL,
  budget_bucket INTEGER NOT NULL,
  center_location extensions.geometry(Point, 4326) NOT NULL,
  cluster_radius_meters INTEGER NOT NULL DEFAULT 1000,
  window_days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commuter_request_clusters_category_valid
    CHECK (category IN ('FOOD', 'DRINK', 'DAILY_NEEDS', 'SERVICE', 'OTHER_LOCAL_NEED')),
  CONSTRAINT commuter_request_clusters_status_valid
    CHECK (status IN ('ACTIVE', 'STALE', 'CLOSED')),
  CONSTRAINT commuter_request_clusters_radius_valid
    CHECK (cluster_radius_meters = 1000),
  CONSTRAINT commuter_request_clusters_window_valid
    CHECK (window_days = 7),
  CONSTRAINT commuter_request_clusters_location_valid
    CHECK (ST_SRID(center_location) = 4326 AND GeometryType(center_location) = 'POINT')
);

CREATE TABLE IF NOT EXISTS public.commuter_request_cluster_members (
  cluster_id UUID NOT NULL REFERENCES public.commuter_request_clusters(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.commuter_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, request_id),
  CONSTRAINT commuter_request_cluster_members_one_active_signal UNIQUE (request_id)
);

CREATE TABLE IF NOT EXISTS public.umkm_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES public.commuter_request_clusters(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  responder_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT umkm_request_responses_status_valid
    CHECK (status IN ('AVAILABLE', 'WILL_TRY', 'PREPARING', 'UNAVAILABLE')),
  CONSTRAINT umkm_request_responses_message_length
    CHECK (message IS NULL OR char_length(message) <= 500),
  CONSTRAINT umkm_request_responses_one_per_merchant_signal
    UNIQUE (signal_id, merchant_id)
);

ALTER TABLE public.commuter_request_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commuter_request_cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm_request_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commuter_request_clusters_authenticated_select"
  ON public.commuter_request_clusters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "umkm_request_responses_authenticated_select"
  ON public.umkm_request_responses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS commuter_request_clusters_category_updated_idx
  ON public.commuter_request_clusters (category, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS commuter_request_clusters_center_gist_idx
  ON public.commuter_request_clusters USING GIST (center_location);

CREATE INDEX IF NOT EXISTS commuter_request_cluster_members_request_idx
  ON public.commuter_request_cluster_members (request_id);

CREATE INDEX IF NOT EXISTS umkm_request_responses_signal_idx
  ON public.umkm_request_responses (signal_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS umkm_request_responses_merchant_idx
  ON public.umkm_request_responses (merchant_id);

CREATE OR REPLACE FUNCTION public.refresh_community_demand_signals_v1()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
BEGIN
  WITH eligible_requests AS (
    SELECT
      request.id,
      request.category,
      request.max_budget,
      request.location,
      ST_SnapToGrid(request.location, 0.01) AS grid_location,
      FLOOR((request.max_budget - 1)::NUMERIC / 25000)::INTEGER AS budget_bucket
    FROM public.commuter_requests AS request
    WHERE request.status = 'ACTIVE'
      AND request.expires_at > now()
      AND request.created_at >= now() - INTERVAL '7 days'
  ), grouped_requests AS (
    SELECT
      eligible.category,
      ST_X(eligible.grid_location) AS grid_longitude,
      ST_Y(eligible.grid_location) AS grid_latitude,
      eligible.budget_bucket,
      concat_ws(
        ':',
        eligible.category,
        ST_X(eligible.grid_location)::TEXT,
        ST_Y(eligible.grid_location)::TEXT,
        eligible.budget_bucket::TEXT,
        '7'
      ) AS aggregation_key,
      ST_SetSRID(
        ST_MakePoint(
          ST_X(ST_SnapToGrid(ST_Centroid(ST_Collect(eligible.location)), 0.001)),
          ST_Y(ST_SnapToGrid(ST_Centroid(ST_Collect(eligible.location)), 0.001))
        ),
        4326
      ) AS center_location
    FROM eligible_requests AS eligible
    GROUP BY
      eligible.category,
      eligible.grid_location,
      eligible.budget_bucket
  )
  INSERT INTO public.commuter_request_clusters (
    aggregation_key,
    category,
    grid_longitude,
    grid_latitude,
    budget_bucket,
    center_location,
    cluster_radius_meters,
    window_days,
    status
  )
  SELECT
    grouped.aggregation_key,
    grouped.category,
    grouped.grid_longitude,
    grouped.grid_latitude,
    grouped.budget_bucket,
    grouped.center_location,
    1000,
    7,
    'ACTIVE'
  FROM grouped_requests AS grouped
  ON CONFLICT (aggregation_key) DO UPDATE
    SET center_location = EXCLUDED.center_location,
        status = 'ACTIVE',
        updated_at = now();

  WITH eligible_requests AS (
    SELECT
      request.id,
      request.category,
      request.location,
      ST_X(ST_SnapToGrid(request.location, 0.01)) AS grid_longitude,
      ST_Y(ST_SnapToGrid(request.location, 0.01)) AS grid_latitude,
      FLOOR((request.max_budget - 1)::NUMERIC / 25000)::INTEGER AS budget_bucket
    FROM public.commuter_requests AS request
    WHERE request.status = 'ACTIVE'
      AND request.expires_at > now()
      AND request.created_at >= now() - INTERVAL '7 days'
  ), current_members AS (
    SELECT
      cluster.id AS cluster_id,
      eligible.id AS request_id
    FROM eligible_requests AS eligible
    JOIN public.commuter_request_clusters AS cluster
      ON cluster.category = eligible.category
     AND cluster.grid_longitude = eligible.grid_longitude
     AND cluster.grid_latitude = eligible.grid_latitude
     AND cluster.budget_bucket = eligible.budget_bucket
     AND cluster.window_days = 7
     AND cluster.cluster_radius_meters = 1000
     AND ST_DWithin(
       eligible.location::geography,
       cluster.center_location::geography,
       cluster.cluster_radius_meters::DOUBLE PRECISION
     )
  )
  DELETE FROM public.commuter_request_cluster_members AS member
  WHERE NOT EXISTS (
    SELECT 1
    FROM current_members AS current_member
    WHERE current_member.cluster_id = member.cluster_id
      AND current_member.request_id = member.request_id
  );

  WITH eligible_requests AS (
    SELECT
      request.id,
      request.category,
      request.location,
      ST_X(ST_SnapToGrid(request.location, 0.01)) AS grid_longitude,
      ST_Y(ST_SnapToGrid(request.location, 0.01)) AS grid_latitude,
      FLOOR((request.max_budget - 1)::NUMERIC / 25000)::INTEGER AS budget_bucket
    FROM public.commuter_requests AS request
    WHERE request.status = 'ACTIVE'
      AND request.expires_at > now()
      AND request.created_at >= now() - INTERVAL '7 days'
  )
  INSERT INTO public.commuter_request_cluster_members (cluster_id, request_id)
  SELECT
    cluster.id,
    eligible.id
  FROM eligible_requests AS eligible
  JOIN public.commuter_request_clusters AS cluster
    ON cluster.category = eligible.category
   AND cluster.grid_longitude = eligible.grid_longitude
   AND cluster.grid_latitude = eligible.grid_latitude
   AND cluster.budget_bucket = eligible.budget_bucket
   AND cluster.window_days = 7
   AND cluster.cluster_radius_meters = 1000
   AND ST_DWithin(
     eligible.location::geography,
     cluster.center_location::geography,
     cluster.cluster_radius_meters::DOUBLE PRECISION
   )
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_demand_signals_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  request_count BIGINT,
  budget_min BIGINT,
  budget_max BIGINT,
  budget_median BIGINT,
  center_longitude DOUBLE PRECISION,
  center_latitude DOUBLE PRECISION,
  cluster_radius_meters INTEGER,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  latest_activity_at TIMESTAMPTZ,
  status TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  normalized_category TEXT := NULLIF(upper(btrim(p_category)), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_category IS NOT NULL
    AND normalized_category NOT IN ('FOOD', 'DRINK', 'DAILY_NEEDS', 'SERVICE', 'OTHER_LOCAL_NEED') THEN
    RAISE EXCEPTION 'Invalid request category' USING ERRCODE = '23514';
  END IF;

  PERFORM public.refresh_community_demand_signals_v1();

  RETURN QUERY
  WITH signal_rows AS (
    SELECT
      cluster.id,
      cluster.category,
      COUNT(DISTINCT request.id)::BIGINT AS request_count,
      MIN(request.max_budget)::BIGINT AS budget_min,
      MAX(request.max_budget)::BIGINT AS budget_max,
      percentile_disc(0.5) WITHIN GROUP (ORDER BY request.max_budget)::BIGINT AS budget_median,
      ST_X(cluster.center_location) AS center_longitude,
      ST_Y(cluster.center_location) AS center_latitude,
      cluster.cluster_radius_meters,
      now() - INTERVAL '7 days' AS window_start,
      now() AS window_end,
      MAX(request.created_at) AS latest_activity_at,
      cluster.status
    FROM public.commuter_request_clusters AS cluster
    JOIN public.commuter_request_cluster_members AS member
      ON member.cluster_id = cluster.id
    JOIN public.commuter_requests AS request
      ON request.id = member.request_id
     AND request.status = 'ACTIVE'
     AND request.expires_at > now()
     AND request.created_at >= now() - INTERVAL '7 days'
    WHERE (normalized_category IS NULL OR cluster.category = normalized_category)
      AND cluster.status = 'ACTIVE'
      AND ST_DWithin(
        request.location::geography,
        cluster.center_location::geography,
        cluster.cluster_radius_meters::DOUBLE PRECISION
      )
    GROUP BY cluster.id
    HAVING COUNT(DISTINCT request.id) >= 3
  ), counted_rows AS (
    SELECT signal_rows.*, COUNT(*) OVER() AS total_count
    FROM signal_rows
    ORDER BY signal_rows.request_count DESC, signal_rows.latest_activity_at DESC, signal_rows.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT * FROM counted_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_demand_signal_detail_v1(
  p_signal_id UUID
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  request_count BIGINT,
  budget_min BIGINT,
  budget_max BIGINT,
  budget_median BIGINT,
  center_longitude DOUBLE PRECISION,
  center_latitude DOUBLE PRECISION,
  cluster_radius_meters INTEGER,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  latest_activity_at TIMESTAMPTZ,
  status TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM public.refresh_community_demand_signals_v1();

  RETURN QUERY
  SELECT
    cluster.id,
    cluster.category,
    COUNT(DISTINCT request.id)::BIGINT AS request_count,
    MIN(request.max_budget)::BIGINT AS budget_min,
    MAX(request.max_budget)::BIGINT AS budget_max,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY request.max_budget)::BIGINT AS budget_median,
    ST_X(cluster.center_location) AS center_longitude,
    ST_Y(cluster.center_location) AS center_latitude,
    cluster.cluster_radius_meters,
    now() - INTERVAL '7 days' AS window_start,
    now() AS window_end,
    MAX(request.created_at) AS latest_activity_at,
    cluster.status,
    1::BIGINT AS total_count
  FROM public.commuter_request_clusters AS cluster
  JOIN public.commuter_request_cluster_members AS member
    ON member.cluster_id = cluster.id
  JOIN public.commuter_requests AS request
    ON request.id = member.request_id
   AND request.status = 'ACTIVE'
   AND request.expires_at > now()
   AND request.created_at >= now() - INTERVAL '7 days'
  WHERE cluster.id = p_signal_id
    AND cluster.status = 'ACTIVE'
    AND ST_DWithin(
      request.location::geography,
      cluster.center_location::geography,
      cluster.cluster_radius_meters::DOUBLE PRECISION
    )
  GROUP BY cluster.id
  HAVING COUNT(DISTINCT request.id) >= 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_demand_signal_responses_v1(
  p_signal_id UUID
)
RETURNS TABLE (
  id UUID,
  signal_id UUID,
  merchant_id UUID,
  merchant_display_name TEXT,
  status TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    response.id,
    response.signal_id,
    response.merchant_id,
    merchant.name AS merchant_display_name,
    response.status,
    response.message,
    response.created_at,
    response.updated_at
  FROM public.umkm_request_responses AS response
  JOIN public.merchants AS merchant ON merchant.id = response.merchant_id
  WHERE response.signal_id = p_signal_id
  ORDER BY response.updated_at DESC, response.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_response_merchants_v1()
RETURNS TABLE (
  id UUID,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT merchant.id, merchant.name
  FROM public.merchants AS merchant
  WHERE merchant.owner_id = auth.uid()
    AND merchant.publish_status NOT IN ('HIDDEN', 'ARCHIVED')
    AND merchant.verification_status <> 'REJECTED'
  ORDER BY merchant.name ASC, merchant.id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_community_demand_signal_response_v1(
  p_signal_id UUID,
  p_merchant_id UUID,
  p_status TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  signal_id UUID,
  merchant_id UUID,
  merchant_display_name TEXT,
  status TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  normalized_status TEXT := upper(btrim(p_status));
  normalized_message TEXT := NULLIF(btrim(COALESCE(p_message, '')), '');
  current_response public.umkm_request_responses%ROWTYPE;
  signal_count BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_status NOT IN ('AVAILABLE', 'WILL_TRY', 'PREPARING', 'UNAVAILABLE') THEN
    RAISE EXCEPTION 'Invalid response status' USING ERRCODE = '23514';
  END IF;

  IF normalized_message IS NOT NULL AND char_length(normalized_message) > 500 THEN
    RAISE EXCEPTION 'Invalid response message' USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*) INTO signal_count
  FROM public.get_community_demand_signal_detail_v1(p_signal_id);

  IF signal_count <> 1 THEN
    RAISE EXCEPTION 'Demand signal is not active' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.merchants AS merchant
    WHERE merchant.id = p_merchant_id
      AND merchant.owner_id = auth.uid()
      AND merchant.publish_status NOT IN ('HIDDEN', 'ARCHIVED')
      AND merchant.verification_status <> 'REJECTED'
  ) THEN
    RAISE EXCEPTION 'Merchant ownership required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.umkm_request_responses (
    signal_id,
    merchant_id,
    responder_user_id,
    status,
    message
  )
  VALUES (
    p_signal_id,
    p_merchant_id,
    auth.uid(),
    normalized_status,
    normalized_message
  )
  ON CONFLICT ON CONSTRAINT umkm_request_responses_one_per_merchant_signal DO UPDATE
    SET status = EXCLUDED.status,
        message = EXCLUDED.message,
        responder_user_id = auth.uid(),
        updated_at = now()
  RETURNING * INTO current_response;

  RETURN QUERY
  SELECT *
  FROM public.list_community_demand_signal_responses_v1(p_signal_id) AS response
  WHERE response.id = current_response.id;
END;
$$;

REVOKE ALL ON TABLE public.commuter_request_clusters FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.commuter_request_cluster_members FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.umkm_request_responses FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.commuter_request_clusters FROM authenticated;
REVOKE ALL ON TABLE public.commuter_request_cluster_members FROM authenticated;
REVOKE ALL ON TABLE public.umkm_request_responses FROM authenticated;
GRANT SELECT ON TABLE public.commuter_request_clusters TO authenticated;
GRANT SELECT ON TABLE public.umkm_request_responses TO authenticated;
GRANT ALL ON TABLE public.commuter_request_clusters TO service_role;
GRANT ALL ON TABLE public.commuter_request_cluster_members TO service_role;
GRANT ALL ON TABLE public.umkm_request_responses TO service_role;

REVOKE ALL ON FUNCTION public.refresh_community_demand_signals_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_demand_signals_v1(INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_demand_signal_detail_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_demand_signal_responses_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_response_merchants_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_community_demand_signal_response_v1(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_community_demand_signals_v1(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_demand_signal_detail_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_demand_signal_responses_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_response_merchants_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_community_demand_signal_response_v1(UUID, UUID, TEXT, TEXT) TO authenticated;

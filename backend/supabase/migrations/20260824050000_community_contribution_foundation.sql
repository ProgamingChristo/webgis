CREATE OR REPLACE FUNCTION public.is_valid_community_contribution_payload_v1(
  p_report_type TEXT,
  p_report_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  key_count INTEGER;
  entry RECORD;
BEGIN
  IF p_report_data IS NULL OR jsonb_typeof(p_report_data) <> 'object' THEN
    RETURN FALSE;
  END IF;

  IF p_report_type = 'SIDEWALK_OBSTRUCTION' THEN
    RETURN
      p_report_data ? 'details'
      AND COALESCE((
        SELECT bool_and(payload_key = ANY (ARRAY['details', 'pedestrian_edge_id']))
        FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
      ), TRUE)
      AND jsonb_typeof(p_report_data->'details') = 'string'
      AND char_length(btrim(p_report_data->>'details')) BETWEEN 1 AND 500
      AND (
        NOT p_report_data ? 'pedestrian_edge_id'
        OR (
          jsonb_typeof(p_report_data->'pedestrian_edge_id') = 'string'
          AND (p_report_data->>'pedestrian_edge_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        )
      );
  END IF;

  IF p_report_type = 'RAMP_OR_GUIDING_BLOCK' THEN
    RETURN
      p_report_data ? 'facility_type'
      AND p_report_data ? 'details'
      AND COALESCE((
        SELECT bool_and(payload_key = ANY (ARRAY['facility_type', 'details']))
        FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
      ), TRUE)
      AND p_report_data->>'facility_type' IN ('RAMP', 'GUIDING_BLOCK')
      AND jsonb_typeof(p_report_data->'details') = 'string'
      AND char_length(btrim(p_report_data->>'details')) BETWEEN 1 AND 500;
  END IF;

  IF p_report_type = 'CROSSING' THEN
    RETURN
      p_report_data ? 'details'
      AND COALESCE((
        SELECT bool_and(payload_key = 'details')
        FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
      ), TRUE)
      AND jsonb_typeof(p_report_data->'details') = 'string'
      AND char_length(btrim(p_report_data->>'details')) BETWEEN 1 AND 500;
  END IF;

  IF p_report_type = 'MERCHANT_LOCATION_CHANGED' THEN
    RETURN
      COALESCE((
        SELECT bool_and(payload_key = 'notes')
        FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
      ), TRUE)
      AND (
        NOT p_report_data ? 'notes'
        OR (
          jsonb_typeof(p_report_data->'notes') = 'string'
          AND char_length(btrim(p_report_data->>'notes')) BETWEEN 1 AND 500
        )
      );
  END IF;

  IF p_report_type = 'MERCHANT_PRICE_CHANGED' THEN
    RETURN
      p_report_data ? 'reported_price_level'
      AND COALESCE((
        SELECT bool_and(payload_key = ANY (ARRAY['reported_price_level', 'notes']))
        FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
      ), TRUE)
      AND jsonb_typeof(p_report_data->'reported_price_level') = 'string'
      AND char_length(btrim(p_report_data->>'reported_price_level')) BETWEEN 1 AND 64
      AND (
        NOT p_report_data ? 'notes'
        OR (
          jsonb_typeof(p_report_data->'notes') = 'string'
          AND char_length(btrim(p_report_data->>'notes')) BETWEEN 1 AND 500
        )
      );
  END IF;

  IF p_report_type = 'MERCHANT_HOURS_CHANGED' THEN
    IF NOT p_report_data ? 'reported_opening_hours' THEN
      RETURN FALSE;
    END IF;

    IF NOT COALESCE((
      SELECT bool_and(payload_key = ANY (ARRAY['reported_opening_hours', 'notes']))
      FROM jsonb_object_keys(p_report_data) AS payload_keys(payload_key)
    ), TRUE) THEN
      RETURN FALSE;
    END IF;

    IF jsonb_typeof(p_report_data->'reported_opening_hours') <> 'object' THEN
      RETURN FALSE;
    END IF;

    SELECT count(*) INTO key_count
    FROM jsonb_object_keys(p_report_data->'reported_opening_hours');

    IF key_count < 1 OR key_count > 14 THEN
      RETURN FALSE;
    END IF;

    FOR entry IN
      SELECT key, value
      FROM jsonb_each(p_report_data->'reported_opening_hours')
    LOOP
      IF char_length(entry.key) < 1 OR char_length(entry.key) > 32 THEN
        RETURN FALSE;
      END IF;

      IF jsonb_typeof(entry.value) <> 'string'
        OR char_length(btrim(entry.value #>> '{}')) < 1
        OR char_length(entry.value #>> '{}') > 128 THEN
        RETURN FALSE;
      END IF;
    END LOOP;

    RETURN (
      NOT p_report_data ? 'notes'
      OR (
        jsonb_typeof(p_report_data->'notes') = 'string'
        AND char_length(btrim(p_report_data->>'notes')) BETWEEN 1 AND 500
      )
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE TABLE IF NOT EXISTS public.community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (
    report_type IN (
      'SIDEWALK_OBSTRUCTION',
      'RAMP_OR_GUIDING_BLOCK',
      'CROSSING',
      'MERCHANT_LOCATION_CHANGED',
      'MERCHANT_PRICE_CHANGED',
      'MERCHANT_HOURS_CHANGED'
    )
  ),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  location extensions.geometry(Point, 4326) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_merchant_id UUID REFERENCES public.merchants(id) ON DELETE RESTRICT,
  reported_new_location extensions.geometry(Point, 4326),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_contributions_location_valid
    CHECK (public.is_valid_wgs84_geometry(location, ARRAY['POINT']::TEXT[])),
  CONSTRAINT community_contributions_reported_new_location_valid
    CHECK (
      reported_new_location IS NULL
      OR public.is_valid_wgs84_geometry(reported_new_location, ARRAY['POINT']::TEXT[])
    ),
  CONSTRAINT community_contributions_payload_valid
    CHECK (public.is_valid_community_contribution_payload_v1(report_type, report_data)),
  CONSTRAINT community_contributions_merchant_target_consistent
    CHECK (
      (
        report_type IN ('SIDEWALK_OBSTRUCTION', 'RAMP_OR_GUIDING_BLOCK', 'CROSSING')
        AND target_merchant_id IS NULL
        AND reported_new_location IS NULL
      )
      OR (
        report_type = 'MERCHANT_LOCATION_CHANGED'
        AND target_merchant_id IS NOT NULL
        AND reported_new_location IS NOT NULL
      )
      OR (
        report_type IN ('MERCHANT_PRICE_CHANGED', 'MERCHANT_HOURS_CHANGED')
        AND target_merchant_id IS NOT NULL
        AND reported_new_location IS NULL
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_community_contributions_author_created
  ON public.community_contributions (author_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_contributions_status_created
  ON public.community_contributions (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_contributions_report_type_created
  ON public.community_contributions (report_type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_contributions_observed_at
  ON public.community_contributions (observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_contributions_target_merchant
  ON public.community_contributions (target_merchant_id)
  WHERE target_merchant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_contributions_location_gist
  ON public.community_contributions USING GIST (location);

CREATE OR REPLACE FUNCTION public.set_community_contributions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_contributions_updated_at
  ON public.community_contributions;

CREATE TRIGGER trg_community_contributions_updated_at
  BEFORE UPDATE ON public.community_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_community_contributions_updated_at();

ALTER TABLE public.community_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_contributions_owner_select
  ON public.community_contributions
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY community_contributions_insert_own_pending
  ON public.community_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'PENDING');

REVOKE ALL ON public.community_contributions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.community_contributions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_community_contribution_v1(
  p_contribution_id UUID
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  report_type TEXT,
  status TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ,
  report_data JSONB,
  target_merchant_id UUID,
  reported_new_longitude DOUBLE PRECISION,
  reported_new_latitude DOUBLE PRECISION,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    contribution.id,
    contribution.author_id,
    contribution.report_type,
    contribution.status,
    ST_X(contribution.location) AS location_longitude,
    ST_Y(contribution.location) AS location_latitude,
    contribution.observed_at,
    contribution.report_data,
    contribution.target_merchant_id,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_X(contribution.reported_new_location)
    END AS reported_new_longitude,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_Y(contribution.reported_new_location)
    END AS reported_new_latitude,
    contribution.submitted_at,
    contribution.created_at,
    contribution.updated_at
  FROM public.community_contributions AS contribution
  WHERE contribution.id = p_contribution_id
    AND contribution.author_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.create_community_contribution_v1(
  p_report_type TEXT,
  p_longitude DOUBLE PRECISION,
  p_latitude DOUBLE PRECISION,
  p_observed_at TIMESTAMPTZ,
  p_report_data JSONB,
  p_target_merchant_id UUID DEFAULT NULL,
  p_reported_new_longitude DOUBLE PRECISION DEFAULT NULL,
  p_reported_new_latitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  report_type TEXT,
  status TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ,
  report_data JSONB,
  target_merchant_id UUID,
  reported_new_longitude DOUBLE PRECISION,
  reported_new_latitude DOUBLE PRECISION,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  inserted_id UUID;
  normalized_report_type TEXT := upper(btrim(p_report_type));
  contribution_location extensions.geometry(Point, 4326);
  new_location extensions.geometry(Point, 4326);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_report_type NOT IN (
    'SIDEWALK_OBSTRUCTION',
    'RAMP_OR_GUIDING_BLOCK',
    'CROSSING',
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    RAISE EXCEPTION 'Invalid contribution report type' USING ERRCODE = '23514';
  END IF;

  IF p_longitude IS NULL OR p_latitude IS NULL
    OR p_longitude < -180 OR p_longitude > 180
    OR p_latitude < -90 OR p_latitude > 90
    OR p_longitude = 'Infinity'::DOUBLE PRECISION
    OR p_longitude = '-Infinity'::DOUBLE PRECISION
    OR p_longitude = 'NaN'::DOUBLE PRECISION
    OR p_latitude = 'Infinity'::DOUBLE PRECISION
    OR p_latitude = '-Infinity'::DOUBLE PRECISION
    OR p_latitude = 'NaN'::DOUBLE PRECISION THEN
    RAISE EXCEPTION 'Invalid contribution location' USING ERRCODE = '23514';
  END IF;

  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'Contribution observed_at is required' USING ERRCODE = '23514';
  END IF;

  IF NOT public.is_valid_community_contribution_payload_v1(normalized_report_type, p_report_data) THEN
    RAISE EXCEPTION 'Invalid contribution payload' USING ERRCODE = '23514';
  END IF;

  contribution_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);

  IF normalized_report_type IN (
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    IF p_target_merchant_id IS NULL THEN
      RAISE EXCEPTION 'Contribution target merchant is required' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.merchants AS merchant
      WHERE merchant.id = p_target_merchant_id
        AND COALESCE(merchant.publish_status, 'PUBLISHED') <> 'ARCHIVED'
    ) THEN
      RAISE EXCEPTION 'Contribution target merchant not found' USING ERRCODE = '23503';
    END IF;
  ELSIF p_target_merchant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Infrastructure contributions cannot target merchants' USING ERRCODE = '23514';
  END IF;

  IF normalized_report_type = 'MERCHANT_LOCATION_CHANGED' THEN
    IF p_reported_new_longitude IS NULL OR p_reported_new_latitude IS NULL
      OR p_reported_new_longitude < -180 OR p_reported_new_longitude > 180
      OR p_reported_new_latitude < -90 OR p_reported_new_latitude > 90
      OR p_reported_new_longitude = 'Infinity'::DOUBLE PRECISION
      OR p_reported_new_longitude = '-Infinity'::DOUBLE PRECISION
      OR p_reported_new_longitude = 'NaN'::DOUBLE PRECISION
      OR p_reported_new_latitude = 'Infinity'::DOUBLE PRECISION
      OR p_reported_new_latitude = '-Infinity'::DOUBLE PRECISION
      OR p_reported_new_latitude = 'NaN'::DOUBLE PRECISION THEN
      RAISE EXCEPTION 'Invalid reported merchant location' USING ERRCODE = '23514';
    END IF;

    new_location := ST_SetSRID(
      ST_MakePoint(p_reported_new_longitude, p_reported_new_latitude),
      4326
    );
  ELSIF p_reported_new_longitude IS NOT NULL OR p_reported_new_latitude IS NOT NULL THEN
    RAISE EXCEPTION 'Reported merchant location is only allowed for merchant moved reports' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.community_contributions (
    author_id,
    report_type,
    status,
    location,
    observed_at,
    report_data,
    target_merchant_id,
    reported_new_location
  )
  VALUES (
    auth.uid(),
    normalized_report_type,
    'PENDING',
    contribution_location,
    p_observed_at,
    p_report_data,
    p_target_merchant_id,
    new_location
  )
  RETURNING id INTO inserted_id;

  RETURN QUERY
  SELECT *
  FROM public.get_community_contribution_v1(inserted_id);
END;
$$;

REVOKE ALL ON FUNCTION public.is_valid_community_contribution_payload_v1(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_community_contribution_v1(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, JSONB, UUID, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_contribution_v1(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_valid_community_contribution_payload_v1(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_contribution_v1(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, JSONB, UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_contribution_v1(UUID) TO authenticated;

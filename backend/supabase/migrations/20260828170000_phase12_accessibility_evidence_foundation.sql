-- Phase 12: Activities + Accessibility Foundation.
-- Additive metadata and safe read APIs for accessibility evidence.
-- Raw MAPID Mission and Community Contribution storage remains unchanged.

CREATE TABLE IF NOT EXISTS public.accessibility_evidence_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'OBSERVED',
  confirmed_category TEXT,
  confirmed_subcategory TEXT,
  candidate_network_feature_type TEXT,
  candidate_network_feature_id TEXT,
  candidate_distance_m NUMERIC,
  relation_status TEXT NOT NULL DEFAULT 'CANDIDATE',
  routing_effect_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accessibility_evidence_reviews_source_check
    CHECK (source_type IN ('MAPID_ACTIVITY', 'GETRA_COMMUNITY')),
  CONSTRAINT accessibility_evidence_reviews_validation_check
    CHECK (validation_status IN ('OBSERVED', 'NEEDS_REVIEW', 'REVIEWED', 'CONFIRMED', 'REJECTED', 'STALE')),
  CONSTRAINT accessibility_evidence_reviews_category_check
    CHECK (
      confirmed_category IS NULL OR confirmed_category IN (
        'TRANSIT_OBSERVATION',
        'ACCESSIBILITY_OBSERVATION',
        'PEDESTRIAN_OBSERVATION',
        'ECONOMIC_UMKM_OBSERVATION',
        'AREA_OBSERVATION',
        'UNCLASSIFIED'
      )
    ),
  CONSTRAINT accessibility_evidence_reviews_subcategory_check
    CHECK (
      confirmed_subcategory IS NULL OR confirmed_subcategory IN (
        'SIDEWALK',
        'CROSSING',
        'GUIDING_BLOCK',
        'WHEELCHAIR_ACCESS',
        'OBSTRUCTION',
        'SURFACE_CONDITION',
        'TRANSIT_ACCESS',
        'OTHER_ACCESSIBILITY'
      )
    ),
  CONSTRAINT accessibility_evidence_reviews_relation_status_check
    CHECK (relation_status IN ('CANDIDATE', 'CONFIRMED_RELATION', 'REJECTED_RELATION')),
  CONSTRAINT accessibility_evidence_reviews_no_phase12_routing_effect
    CHECK (routing_effect_enabled = FALSE),
  CONSTRAINT accessibility_evidence_reviews_source_identity_key
    UNIQUE (source_type, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_accessibility_evidence_reviews_status_source
  ON public.accessibility_evidence_reviews (validation_status, source_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_accessibility_evidence_reviews_source_identity
  ON public.accessibility_evidence_reviews (source_type, source_record_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_evidence_reviews_relation
  ON public.accessibility_evidence_reviews (
    candidate_network_feature_type,
    candidate_network_feature_id,
    relation_status
  )
  WHERE candidate_network_feature_id IS NOT NULL;

DROP TRIGGER IF EXISTS handle_updated_at_accessibility_evidence_reviews
  ON public.accessibility_evidence_reviews;

CREATE TRIGGER handle_updated_at_accessibility_evidence_reviews
  BEFORE UPDATE ON public.accessibility_evidence_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.accessibility_evidence_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accessibility_evidence_reviews_service_role_all
  ON public.accessibility_evidence_reviews;

CREATE POLICY accessibility_evidence_reviews_service_role_all
  ON public.accessibility_evidence_reviews
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS accessibility_evidence_reviews_admin_read
  ON public.accessibility_evidence_reviews;

CREATE POLICY accessibility_evidence_reviews_admin_read
  ON public.accessibility_evidence_reviews
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

REVOKE ALL ON public.accessibility_evidence_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.accessibility_evidence_reviews TO authenticated;
GRANT ALL ON public.accessibility_evidence_reviews TO service_role;

CREATE OR REPLACE FUNCTION public.get_accessibility_observation_category_v1(
  p_source_type TEXT,
  p_properties JSONB,
  p_report_type TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_source_type = 'GETRA_COMMUNITY'
      AND p_report_type IN ('SIDEWALK_OBSTRUCTION', 'RAMP_OR_GUIDING_BLOCK', 'CROSSING')
      THEN 'ACCESSIBILITY_OBSERVATION'
    WHEN p_source_type = 'MAPID_ACTIVITY'
      AND upper(coalesce(p_properties->>'category', '')) IN (
        'TRANSIT_OBSERVATION',
        'ACCESSIBILITY_OBSERVATION',
        'PEDESTRIAN_OBSERVATION',
        'ECONOMIC_UMKM_OBSERVATION',
        'AREA_OBSERVATION',
        'UNCLASSIFIED'
      )
      THEN upper(p_properties->>'category')
    WHEN p_source_type = 'MAPID_ACTIVITY'
      AND (
        lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', ''))
          ~ '(akses|access|trotoar|sidewalk|penyeberangan|crossing|zebra|guiding|pemandu|ramp|kursi roda|wheelchair|halte|transit|stasiun)'
      )
      THEN 'ACCESSIBILITY_OBSERVATION'
    ELSE 'UNCLASSIFIED'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_accessibility_observation_subcategory_v1(
  p_source_type TEXT,
  p_properties JSONB,
  p_report_type TEXT DEFAULT NULL,
  p_report_data JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_source_type = 'GETRA_COMMUNITY' AND p_report_type = 'SIDEWALK_OBSTRUCTION'
      THEN 'OBSTRUCTION'
    WHEN p_source_type = 'GETRA_COMMUNITY' AND p_report_type = 'CROSSING'
      THEN 'CROSSING'
    WHEN p_source_type = 'GETRA_COMMUNITY' AND p_report_type = 'RAMP_OR_GUIDING_BLOCK'
      AND upper(coalesce(p_report_data->>'facility_type', '')) = 'GUIDING_BLOCK'
      THEN 'GUIDING_BLOCK'
    WHEN p_source_type = 'GETRA_COMMUNITY' AND p_report_type = 'RAMP_OR_GUIDING_BLOCK'
      THEN 'WHEELCHAIR_ACCESS'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(trotoar|sidewalk)'
      THEN 'SIDEWALK'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(penyeberangan|crossing|zebra)'
      THEN 'CROSSING'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(guiding|pemandu)'
      THEN 'GUIDING_BLOCK'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(ramp|kursi roda|wheelchair)'
      THEN 'WHEELCHAIR_ACCESS'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(halang|obstruction|terhalang)'
      THEN 'OBSTRUCTION'
    WHEN lower(coalesce(p_properties->>'title', '') || ' ' || coalesce(p_properties->>'description', '')) ~ '(halte|transit|stasiun)'
      THEN 'TRANSIT_ACCESS'
    ELSE 'OTHER_ACCESSIBILITY'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_accessibility_freshness_v1(
  p_observed_at TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(p_observed_at, p_created_at) IS NULL THEN 'UNKNOWN'
    WHEN coalesce(p_observed_at, p_created_at) >= now() - interval '30 days' THEN 'RECENT'
    WHEN coalesce(p_observed_at, p_created_at) >= now() - interval '90 days' THEN 'AGING'
    ELSE 'STALE'
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_accessibility_evidence_v1(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_source_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_validation_status TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  source_type TEXT,
  source_record_id TEXT,
  geometry JSONB,
  category TEXT,
  suggested_category TEXT,
  subcategory TEXT,
  title TEXT,
  description TEXT,
  media_urls JSONB,
  observed_at TIMESTAMPTZ,
  freshness_status TEXT,
  validation_status TEXT,
  relation_status TEXT,
  routing_effect_enabled BOOLEAN,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH source_rows AS (
    SELECT
      'MAPID_ACTIVITY'::TEXT AS source_type,
      observation.source_record_id,
      observation.geometry,
      observation.normalized_properties AS properties,
      NULL::TEXT AS report_type,
      '{}'::jsonb AS report_data,
      observation.observed_at,
      observation.imported_at AS created_at,
      left(NULLIF(observation.normalized_properties->>'title', ''), 160) AS title,
      left(NULLIF(observation.normalized_properties->>'description', ''), 600) AS description,
      CASE
        WHEN jsonb_typeof(observation.normalized_properties->'media') = 'array'
          THEN observation.normalized_properties->'media'
        WHEN NULLIF(observation.normalized_properties->>'media', '') IS NOT NULL
          THEN jsonb_build_array(observation.normalized_properties->>'media')
        ELSE '[]'::jsonb
      END AS media_urls
    FROM public.mapid_mission_observations AS observation
    WHERE observation.source_type = 'ACTIVITIES'

    UNION ALL

    SELECT
      'GETRA_COMMUNITY'::TEXT AS source_type,
      contribution.id::TEXT AS source_record_id,
      contribution.location AS geometry,
      '{}'::jsonb AS properties,
      contribution.report_type AS report_type,
      contribution.report_data AS report_data,
      contribution.observed_at,
      contribution.created_at,
      CASE contribution.report_type
        WHEN 'SIDEWALK_OBSTRUCTION' THEN 'Observasi hambatan pedestrian'
        WHEN 'RAMP_OR_GUIDING_BLOCK' THEN 'Observasi fasilitas aksesibilitas'
        WHEN 'CROSSING' THEN 'Observasi penyeberangan'
        ELSE 'Kontribusi komunitas'
      END AS title,
      left(coalesce(contribution.report_data->>'details', contribution.report_data->>'notes', ''), 600) AS description,
      '[]'::jsonb AS media_urls
    FROM public.community_contributions AS contribution
    WHERE contribution.status = 'APPROVED'
      AND contribution.report_type IN ('SIDEWALK_OBSTRUCTION', 'RAMP_OR_GUIDING_BLOCK', 'CROSSING')
  ),
  normalized AS (
    SELECT
      source_rows.*,
      public.get_accessibility_observation_category_v1(
        source_rows.source_type,
        source_rows.properties,
        source_rows.report_type
      ) AS suggested_category,
      public.get_accessibility_observation_subcategory_v1(
        source_rows.source_type,
        source_rows.properties,
        source_rows.report_type,
        source_rows.report_data
      ) AS suggested_subcategory,
      public.get_accessibility_freshness_v1(
        source_rows.observed_at,
        source_rows.created_at
      ) AS computed_freshness
    FROM source_rows
    WHERE extensions.ST_Intersects(
      source_rows.geometry,
      extensions.ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
      AND (
        p_days IS NULL
        OR coalesce(source_rows.observed_at, source_rows.created_at) >= now() - make_interval(days => p_days)
      )
  ),
  reviewed AS (
    SELECT
      normalized.*,
      review.confirmed_category,
      review.confirmed_subcategory,
      coalesce(review.validation_status, CASE
        WHEN normalized.computed_freshness = 'STALE' THEN 'STALE'
        ELSE 'OBSERVED'
      END) AS effective_validation_status,
      coalesce(review.relation_status, 'CANDIDATE') AS effective_relation_status,
      coalesce(review.routing_effect_enabled, false) AS effective_routing_effect_enabled
    FROM normalized
    LEFT JOIN public.accessibility_evidence_reviews AS review
      ON review.source_type = normalized.source_type
     AND review.source_record_id = normalized.source_record_id
  ),
  filtered AS (
    SELECT *
    FROM reviewed
    WHERE (p_source_type IS NULL OR source_type = p_source_type)
      AND (p_category IS NULL OR coalesce(confirmed_category, suggested_category) = p_category)
      AND (p_validation_status IS NULL OR effective_validation_status = p_validation_status)
  ),
  counted AS (
    SELECT COUNT(*) AS total_count FROM filtered
  )
  SELECT
    (filtered.source_type || ':' || filtered.source_record_id) AS id,
    filtered.source_type,
    filtered.source_record_id,
    extensions.ST_AsGeoJSON(filtered.geometry)::jsonb AS geometry,
    coalesce(filtered.confirmed_category, filtered.suggested_category) AS category,
    filtered.suggested_category,
    coalesce(filtered.confirmed_subcategory, filtered.suggested_subcategory) AS subcategory,
    filtered.title,
    NULLIF(filtered.description, '') AS description,
    filtered.media_urls,
    filtered.observed_at,
    filtered.computed_freshness AS freshness_status,
    filtered.effective_validation_status AS validation_status,
    filtered.effective_relation_status AS relation_status,
    filtered.effective_routing_effect_enabled AS routing_effect_enabled,
    counted.total_count
  FROM filtered
  CROSS JOIN counted
  ORDER BY coalesce(filtered.observed_at, filtered.created_at) DESC, filtered.source_record_id DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 100), 1), 250)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_accessibility_evidence_detail_v1(
  p_evidence_id TEXT,
  p_max_distance_m DOUBLE PRECISION DEFAULT 40
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_source_type TEXT := split_part(p_evidence_id, ':', 1);
  v_source_record_id TEXT := substring(p_evidence_id from position(':' in p_evidence_id) + 1);
  v_row RECORD;
  v_candidate RECORD;
BEGIN
  IF v_source_type NOT IN ('MAPID_ACTIVITY', 'GETRA_COMMUNITY') OR v_source_record_id = '' THEN
    RAISE EXCEPTION 'GETRA_INVALID_ACCESSIBILITY_EVIDENCE_ID' USING ERRCODE = '23514';
  END IF;

  WITH source_rows AS (
    SELECT
      'MAPID_ACTIVITY'::TEXT AS source_type,
      observation.source_record_id,
      observation.geometry,
      observation.normalized_properties AS properties,
      NULL::TEXT AS report_type,
      '{}'::jsonb AS report_data,
      observation.observed_at,
      observation.imported_at AS created_at,
      left(NULLIF(observation.normalized_properties->>'title', ''), 160) AS title,
      left(NULLIF(observation.normalized_properties->>'description', ''), 600) AS description,
      CASE
        WHEN jsonb_typeof(observation.normalized_properties->'media') = 'array'
          THEN observation.normalized_properties->'media'
        WHEN NULLIF(observation.normalized_properties->>'media', '') IS NOT NULL
          THEN jsonb_build_array(observation.normalized_properties->>'media')
        ELSE '[]'::jsonb
      END AS media_urls
    FROM public.mapid_mission_observations AS observation
    WHERE v_source_type = 'MAPID_ACTIVITY'
      AND observation.source_type = 'ACTIVITIES'
      AND observation.source_record_id = v_source_record_id

    UNION ALL

    SELECT
      'GETRA_COMMUNITY'::TEXT AS source_type,
      contribution.id::TEXT AS source_record_id,
      contribution.location AS geometry,
      '{}'::jsonb AS properties,
      contribution.report_type AS report_type,
      contribution.report_data AS report_data,
      contribution.observed_at,
      contribution.created_at,
      CASE contribution.report_type
        WHEN 'SIDEWALK_OBSTRUCTION' THEN 'Observasi hambatan pedestrian'
        WHEN 'RAMP_OR_GUIDING_BLOCK' THEN 'Observasi fasilitas aksesibilitas'
        WHEN 'CROSSING' THEN 'Observasi penyeberangan'
        ELSE 'Kontribusi komunitas'
      END AS title,
      left(coalesce(contribution.report_data->>'details', contribution.report_data->>'notes', ''), 600) AS description,
      '[]'::jsonb AS media_urls
    FROM public.community_contributions AS contribution
    WHERE v_source_type = 'GETRA_COMMUNITY'
      AND contribution.status = 'APPROVED'
      AND contribution.report_type IN ('SIDEWALK_OBSTRUCTION', 'RAMP_OR_GUIDING_BLOCK', 'CROSSING')
      AND contribution.id::TEXT = v_source_record_id
  ),
  normalized AS (
    SELECT
      source_rows.*,
      public.get_accessibility_observation_category_v1(source_rows.source_type, source_rows.properties, source_rows.report_type) AS suggested_category,
      public.get_accessibility_observation_subcategory_v1(source_rows.source_type, source_rows.properties, source_rows.report_type, source_rows.report_data) AS suggested_subcategory,
      public.get_accessibility_freshness_v1(source_rows.observed_at, source_rows.created_at) AS computed_freshness
    FROM source_rows
  )
  SELECT
    normalized.source_type,
    normalized.source_record_id,
    extensions.ST_AsGeoJSON(normalized.geometry)::jsonb AS geometry,
    coalesce(review.confirmed_category, normalized.suggested_category) AS category,
    normalized.suggested_category,
    coalesce(review.confirmed_subcategory, normalized.suggested_subcategory) AS subcategory,
    normalized.title,
    NULLIF(normalized.description, '') AS description,
    normalized.media_urls,
    normalized.observed_at,
    normalized.computed_freshness AS freshness_status,
    coalesce(review.validation_status, CASE WHEN normalized.computed_freshness = 'STALE' THEN 'STALE' ELSE 'OBSERVED' END) AS validation_status,
    coalesce(review.relation_status, 'CANDIDATE') AS relation_status
  INTO v_row
  FROM normalized
  LEFT JOIN public.accessibility_evidence_reviews AS review
    ON review.source_type = normalized.source_type
   AND review.source_record_id = normalized.source_record_id
  LIMIT 1;

  IF v_row.source_record_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    edge.id::TEXT AS feature_id,
    extensions.ST_Distance(
      (extensions.ST_GeomFromGeoJSON(v_row.geometry::TEXT))::extensions.geography,
      edge.geometry::extensions.geography
    ) AS distance_m
  INTO v_candidate
  FROM public.pedestrian_edges AS edge
  WHERE edge.environment = 'PRODUCTION'
    AND extensions.ST_DWithin(
      (extensions.ST_GeomFromGeoJSON(v_row.geometry::TEXT))::extensions.geography,
      edge.geometry::extensions.geography,
      LEAST(GREATEST(coalesce(p_max_distance_m, 40), 1), 100)
    )
  ORDER BY (extensions.ST_GeomFromGeoJSON(v_row.geometry::TEXT)) <-> edge.geometry
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_row.source_type || ':' || v_row.source_record_id,
    'source_type', v_row.source_type,
    'source_record_id', v_row.source_record_id,
    'geometry', v_row.geometry,
    'category', v_row.category,
    'suggested_category', v_row.suggested_category,
    'subcategory', v_row.subcategory,
    'title', v_row.title,
    'description', v_row.description,
    'media_urls', v_row.media_urls,
    'observed_at', v_row.observed_at,
    'freshness_status', v_row.freshness_status,
    'validation_status', v_row.validation_status,
    'relation_status', v_row.relation_status,
    'routing_effect_enabled', false,
    'spatial_relation', CASE
      WHEN v_candidate.feature_id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'network_feature_type', 'PEDESTRIAN_EDGE',
        'network_feature_id', v_candidate.feature_id,
        'distance_m', round(v_candidate.distance_m::numeric, 2),
        'relation_status', 'CANDIDATE',
        'routing_effect_enabled', false
      )
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_accessibility_need_summary_v1(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_source_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_validation_status TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH evidence AS (
    SELECT *
    FROM public.list_accessibility_evidence_v1(
      p_min_lng,
      p_min_lat,
      p_max_lng,
      p_max_lat,
      p_source_type,
      p_category,
      p_validation_status,
      p_days,
      250,
      0
    )
  ),
  category_counts AS (
    SELECT coalesce(category, 'UNCLASSIFIED') AS key, count(*) AS value
    FROM evidence
    GROUP BY coalesce(category, 'UNCLASSIFIED')
  ),
  status_counts AS (
    SELECT validation_status AS key, count(*) AS value
    FROM evidence
    GROUP BY validation_status
  ),
  freshness_counts AS (
    SELECT freshness_status AS key, count(*) AS value
    FROM evidence
    GROUP BY freshness_status
  )
  SELECT jsonb_build_object(
    'aggregation_unit', 'VIEWPORT',
    'sample_size', (SELECT count(*) FROM evidence),
    'observation_count', (SELECT count(*) FROM evidence),
    'confirmed_count', (SELECT count(*) FROM evidence WHERE validation_status = 'CONFIRMED'),
    'needs_review_count', (SELECT count(*) FROM evidence WHERE validation_status = 'NEEDS_REVIEW'),
    'observed_count', (SELECT count(*) FROM evidence WHERE validation_status = 'OBSERVED'),
    'recent_count', (SELECT count(*) FROM evidence WHERE freshness_status = 'RECENT'),
    'low_sample', (SELECT count(*) FROM evidence) < 5,
    'category_breakdown', coalesce((SELECT jsonb_object_agg(key, value) FROM category_counts), '{}'::jsonb),
    'validation_breakdown', coalesce((SELECT jsonb_object_agg(key, value) FROM status_counts), '{}'::jsonb),
    'freshness_breakdown', coalesce((SELECT jsonb_object_agg(key, value) FROM freshness_counts), '{}'::jsonb),
    'model', jsonb_build_object(
      'name', 'ACCESSIBILITY_EVIDENCE_COUNTS_V1',
      'score', NULL,
      'limitations', ARRAY[
        'Accessibility Need is based on observed or reviewed evidence counts.',
        'It is not a disability population estimate.',
        'Phase 12 evidence does not modify routing costs.'
      ]
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.review_accessibility_evidence_v1(
  p_evidence_id TEXT,
  p_validation_status TEXT,
  p_confirmed_category TEXT DEFAULT NULL,
  p_confirmed_subcategory TEXT DEFAULT NULL,
  p_review_reason TEXT DEFAULT NULL,
  p_candidate_network_feature_id TEXT DEFAULT NULL,
  p_relation_status TEXT DEFAULT 'CANDIDATE'
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_source_type TEXT := split_part(p_evidence_id, ':', 1);
  v_source_record_id TEXT := substring(p_evidence_id from position(':' in p_evidence_id) + 1);
  v_profile public.profiles%ROWTYPE;
  v_edge public.pedestrian_edges%ROWTYPE;
  v_evidence JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'GETRA_AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_profile.id IS NULL OR v_profile.account_role <> 'ADMIN'::public.account_role THEN
    RAISE EXCEPTION 'GETRA_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF v_source_type NOT IN ('MAPID_ACTIVITY', 'GETRA_COMMUNITY') OR v_source_record_id = '' THEN
    RAISE EXCEPTION 'GETRA_INVALID_ACCESSIBILITY_EVIDENCE_ID' USING ERRCODE = '23514';
  END IF;

  IF p_validation_status NOT IN ('OBSERVED', 'NEEDS_REVIEW', 'REVIEWED', 'CONFIRMED', 'REJECTED', 'STALE') THEN
    RAISE EXCEPTION 'GETRA_INVALID_ACCESSIBILITY_VALIDATION_STATUS' USING ERRCODE = '23514';
  END IF;

  IF p_relation_status NOT IN ('CANDIDATE', 'CONFIRMED_RELATION', 'REJECTED_RELATION') THEN
    RAISE EXCEPTION 'GETRA_INVALID_ACCESSIBILITY_RELATION_STATUS' USING ERRCODE = '23514';
  END IF;

  SELECT public.get_accessibility_evidence_detail_v1(p_evidence_id, 40)
  INTO v_evidence;

  IF v_evidence IS NULL THEN
    RAISE EXCEPTION 'GETRA_ACCESSIBILITY_EVIDENCE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF p_candidate_network_feature_id IS NOT NULL THEN
    SELECT *
    INTO v_edge
    FROM public.pedestrian_edges
    WHERE id::TEXT = p_candidate_network_feature_id
      AND environment = 'PRODUCTION'
    LIMIT 1;

    IF v_edge.id IS NULL THEN
      RAISE EXCEPTION 'GETRA_ACCESSIBILITY_EDGE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;

    IF (v_evidence->'spatial_relation'->>'network_feature_id') IS DISTINCT FROM p_candidate_network_feature_id THEN
      RAISE EXCEPTION 'GETRA_ACCESSIBILITY_EDGE_NOT_CANDIDATE' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.accessibility_evidence_reviews (
    source_type,
    source_record_id,
    validation_status,
    confirmed_category,
    confirmed_subcategory,
    candidate_network_feature_type,
    candidate_network_feature_id,
    candidate_distance_m,
    relation_status,
    routing_effect_enabled,
    review_reason,
    reviewed_by,
    reviewed_at
  )
  VALUES (
    v_source_type,
    v_source_record_id,
    p_validation_status,
    p_confirmed_category,
    p_confirmed_subcategory,
    CASE WHEN p_candidate_network_feature_id IS NULL THEN NULL ELSE 'PEDESTRIAN_EDGE' END,
    p_candidate_network_feature_id,
    CASE
      WHEN p_candidate_network_feature_id IS NULL THEN NULL
      ELSE (v_evidence->'spatial_relation'->>'distance_m')::NUMERIC
    END,
    p_relation_status,
    FALSE,
    left(NULLIF(btrim(coalesce(p_review_reason, '')), ''), 500),
    auth.uid(),
    NOW()
  )
  ON CONFLICT (source_type, source_record_id)
  DO UPDATE SET
    validation_status = EXCLUDED.validation_status,
    confirmed_category = EXCLUDED.confirmed_category,
    confirmed_subcategory = EXCLUDED.confirmed_subcategory,
    candidate_network_feature_type = EXCLUDED.candidate_network_feature_type,
    candidate_network_feature_id = EXCLUDED.candidate_network_feature_id,
    candidate_distance_m = EXCLUDED.candidate_distance_m,
    relation_status = EXCLUDED.relation_status,
    routing_effect_enabled = FALSE,
    review_reason = EXCLUDED.review_reason,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at;

  RETURN public.get_accessibility_evidence_detail_v1(p_evidence_id, 40);
END;
$$;

REVOKE ALL ON FUNCTION public.get_accessibility_observation_category_v1(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessibility_observation_subcategory_v1(TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessibility_freshness_v1(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_accessibility_evidence_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessibility_evidence_detail_v1(TEXT, DOUBLE PRECISION) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessibility_need_summary_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_accessibility_evidence_v1(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_accessibility_observation_category_v1(TEXT, JSONB, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessibility_observation_subcategory_v1(TEXT, JSONB, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessibility_freshness_v1(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_accessibility_evidence_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessibility_evidence_detail_v1(TEXT, DOUBLE PRECISION) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_accessibility_need_summary_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_accessibility_evidence_v1(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

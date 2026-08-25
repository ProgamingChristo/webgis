CREATE OR REPLACE FUNCTION public.award_community_contribution_points_v1(
  p_contribution_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  contribution_id UUID,
  points INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ,
  inserted BOOLEAN
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contribution_record RECORD;
  point_value INTEGER;
BEGIN
  IF p_contribution_id IS NULL THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_ID_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT contribution.id, contribution.author_id, contribution.status
  INTO contribution_record
  FROM public.community_contributions AS contribution
  WHERE contribution.id = p_contribution_id;

  IF contribution_record.id IS NULL THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF contribution_record.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_POINTS_NOT_ELIGIBLE'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT settings.approved_contribution_points
  INTO point_value
  FROM public.community_contribution_points_settings_v1() AS settings;

  RETURN QUERY
  WITH inserted_event AS (
    INSERT INTO public.community_contribution_point_events (
      user_id,
      contribution_id,
      points,
      reason
    )
    VALUES (
      contribution_record.author_id,
      contribution_record.id,
      point_value,
      'APPROVED_CONTRIBUTION'
    )
    ON CONFLICT ON CONSTRAINT community_contribution_point_events_one_award
      DO NOTHING
    RETURNING
      community_contribution_point_events.id,
      community_contribution_point_events.user_id,
      community_contribution_point_events.contribution_id,
      community_contribution_point_events.points,
      community_contribution_point_events.reason,
      community_contribution_point_events.created_at,
      TRUE AS inserted
  )
  SELECT *
  FROM inserted_event
  UNION ALL
  SELECT
    existing_event.id,
    existing_event.user_id,
    existing_event.contribution_id,
    existing_event.points,
    existing_event.reason,
    existing_event.created_at,
    FALSE AS inserted
  FROM public.community_contribution_point_events AS existing_event
  WHERE existing_event.contribution_id = contribution_record.id
    AND NOT EXISTS (SELECT 1 FROM inserted_event)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.award_community_contribution_points_v1(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_community_contribution_points_v1(UUID)
  TO service_role;

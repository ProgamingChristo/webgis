ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE public.umkm_request_responses
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_moderation_status_check'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_moderation_status_check
      CHECK (moderation_status IN ('ACTIVE', 'UNDER_REVIEW', 'HIDDEN', 'REMOVED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_comments_moderation_status_check'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_moderation_status_check
      CHECK (moderation_status IN ('ACTIVE', 'UNDER_REVIEW', 'HIDDEN', 'REMOVED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'umkm_request_responses_moderation_status_check'
  ) THEN
    ALTER TABLE public.umkm_request_responses
      ADD CONSTRAINT umkm_request_responses_moderation_status_check
      CHECK (moderation_status IN ('ACTIVE', 'UNDER_REVIEW', 'HIDDEN', 'REMOVED'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('POST_REPLY', 'COMMENT_REPLY', 'POST_CONFIRMED', 'UMKM_RESPONSE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('POST', 'COMMENT', 'DEMAND_SIGNAL', 'UMKM_RESPONSE')),
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS community_notifications_recipient_created_idx
  ON public.community_notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS community_notifications_unread_idx
  ON public.community_notifications (recipient_user_id, read_at)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('POST', 'COMMENT', 'UMKM_RESPONSE')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'SPAM',
      'INCORRECT_INFORMATION',
      'INVALID_PRICE',
      'INAPPROPRIATE_CONTENT',
      'WRONG_LOCATION',
      'DUPLICATE'
    )
  ),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED')),
  moderation_action TEXT CHECK (moderation_action IS NULL OR moderation_action IN ('HIDE', 'REMOVE', 'RESTORE', 'DISMISS')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_user_id, target_type, target_id, reason)
);

CREATE INDEX IF NOT EXISTS community_reports_status_created_idx
  ON public.community_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL CHECK (topic IN ('POST', 'SIGNAL', 'NOTIFICATION')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  post_id UUID,
  signal_id UUID,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_realtime_events_post_idx
  ON public.community_realtime_events (post_id, created_at DESC)
  WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS community_realtime_events_signal_idx
  ON public.community_realtime_events (signal_id, created_at DESC)
  WHERE signal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS community_realtime_events_recipient_idx
  ON public.community_realtime_events (recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_realtime_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_notifications'
      AND policyname = 'community_notifications_recipient_select'
  ) THEN
    CREATE POLICY community_notifications_recipient_select
      ON public.community_notifications
      FOR SELECT
      TO authenticated
      USING (recipient_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_notifications'
      AND policyname = 'community_notifications_recipient_update'
  ) THEN
    CREATE POLICY community_notifications_recipient_update
      ON public.community_notifications
      FOR UPDATE
      TO authenticated
      USING (recipient_user_id = auth.uid())
      WITH CHECK (recipient_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_reports'
      AND policyname = 'community_reports_reporter_select'
  ) THEN
    CREATE POLICY community_reports_reporter_select
      ON public.community_reports
      FOR SELECT
      TO authenticated
      USING (reporter_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_realtime_events'
      AND policyname = 'community_realtime_events_scoped_select'
  ) THEN
    CREATE POLICY community_realtime_events_scoped_select
      ON public.community_realtime_events
      FOR SELECT
      TO authenticated
      USING (recipient_user_id IS NULL OR recipient_user_id = auth.uid());
  END IF;
END $$;

REVOKE ALL ON public.community_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_realtime_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_notifications TO authenticated;
GRANT UPDATE(read_at) ON public.community_notifications TO authenticated;
GRANT SELECT ON public.community_reports TO authenticated;
GRANT SELECT ON public.community_realtime_events TO authenticated;

CREATE OR REPLACE FUNCTION public.community_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND account_role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.community_emit_realtime_event(
  p_topic TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_post_id UUID DEFAULT NULL,
  p_signal_id UUID DEFAULT NULL,
  p_recipient_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_realtime_events (
    topic,
    entity_type,
    entity_id,
    post_id,
    signal_id,
    recipient_user_id
  )
  VALUES (
    p_topic,
    p_entity_type,
    p_entity_id,
    p_post_id,
    p_signal_id,
    p_recipient_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_create_notification(
  p_recipient_user_id UUID,
  p_actor_user_id UUID,
  p_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_id UUID;
BEGIN
  IF p_recipient_user_id IS NULL OR p_recipient_user_id = p_actor_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.community_notifications (
    recipient_user_id,
    actor_user_id,
    type,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_recipient_user_id,
    p_actor_user_id,
    p_type,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO inserted_id;

  PERFORM public.community_emit_realtime_event(
    'NOTIFICATION',
    p_type,
    inserted_id,
    NULL,
    NULL,
    p_recipient_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_comment_operational_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  parent_author UUID;
BEGIN
  PERFORM public.community_emit_realtime_event(
    'POST',
    'COMMENT',
    NEW.id,
    NEW.post_id,
    NULL,
    NULL
  );

  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_id INTO post_author
    FROM public.community_posts
    WHERE id = NEW.post_id;

    PERFORM public.community_create_notification(
      post_author,
      NEW.author_id,
      'POST_REPLY',
      'COMMENT',
      NEW.id,
      jsonb_build_object('post_id', NEW.post_id)
    );
  ELSE
    SELECT author_id INTO parent_author
    FROM public.community_comments
    WHERE id = NEW.parent_comment_id;

    PERFORM public.community_create_notification(
      parent_author,
      NEW.author_id,
      'COMMENT_REPLY',
      'COMMENT',
      NEW.id,
      jsonb_build_object('post_id', NEW.post_id, 'parent_comment_id', NEW.parent_comment_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_comment_operational_after_insert
  ON public.community_comments;

CREATE TRIGGER community_comment_operational_after_insert
  AFTER INSERT ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.community_comment_operational_trigger();

CREATE OR REPLACE FUNCTION public.community_reaction_operational_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
BEGIN
  PERFORM public.community_emit_realtime_event(
    'POST',
    'REACTION',
    NEW.post_id,
    NEW.post_id,
    NULL,
    NULL
  );

  IF NEW.reaction_type = 'CONFIRMED' THEN
    SELECT author_id INTO post_author
    FROM public.community_posts
    WHERE id = NEW.post_id;

    PERFORM public.community_create_notification(
      post_author,
      NEW.user_id,
      'POST_CONFIRMED',
      'POST',
      NEW.post_id,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_reaction_operational_after_insert
  ON public.community_reactions;

CREATE TRIGGER community_reaction_operational_after_insert
  AFTER INSERT ON public.community_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.community_reaction_operational_trigger();

CREATE OR REPLACE FUNCTION public.community_response_operational_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_actor UUID;
  member_record RECORD;
BEGIN
  SELECT owner_id INTO response_actor
  FROM public.merchants
  WHERE id = NEW.merchant_id;

  PERFORM public.community_emit_realtime_event(
    'SIGNAL',
    'UMKM_RESPONSE',
    NEW.id,
    NULL,
    NEW.signal_id,
    NULL
  );

  FOR member_record IN
    SELECT DISTINCT request.author_id
    FROM public.community_demand_signal_members AS member
    JOIN public.commuter_requests AS request
      ON request.id = member.request_id
    WHERE member.signal_id = NEW.signal_id
  LOOP
    PERFORM public.community_create_notification(
      member_record.author_id,
      response_actor,
      'UMKM_RESPONSE',
      'UMKM_RESPONSE',
      NEW.id,
      jsonb_build_object('signal_id', NEW.signal_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_response_operational_after_upsert
  ON public.umkm_request_responses;

CREATE TRIGGER community_response_operational_after_upsert
  AFTER INSERT OR UPDATE OF status, message ON public.umkm_request_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.community_response_operational_trigger();

CREATE OR REPLACE FUNCTION public.list_community_notifications_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_user_id UUID,
  actor_display_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH paged AS (
    SELECT notification.*, COUNT(*) OVER() AS total_count
    FROM public.community_notifications AS notification
    WHERE notification.recipient_user_id = auth.uid()
    ORDER BY notification.created_at DESC, notification.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    paged.id,
    paged.type,
    paged.entity_type,
    paged.entity_id,
    paged.actor_user_id,
    profile.display_name AS actor_display_name,
    paged.metadata,
    paged.created_at,
    paged.read_at,
    paged.total_count
  FROM paged
  LEFT JOIN public.profiles AS profile
    ON profile.id = paged.actor_user_id
  ORDER BY paged.created_at DESC, paged.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.count_community_unread_notifications_v1()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.community_notifications
  WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_community_notification_read_v1(
  p_notification_id UUID
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.community_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND recipient_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_all_community_notifications_read_v1()
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.community_notifications
  SET read_at = COALESCE(read_at, now())
  WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.create_community_report_v1(
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  details TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_exists BOOLEAN := FALSE;
  report_row public.community_reports%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_target_type NOT IN ('POST', 'COMMENT', 'UMKM_RESPONSE')
    OR p_reason NOT IN (
      'SPAM',
      'INCORRECT_INFORMATION',
      'INVALID_PRICE',
      'INAPPROPRIATE_CONTENT',
      'WRONG_LOCATION',
      'DUPLICATE'
    )
    OR (p_details IS NOT NULL AND char_length(p_details) > 500) THEN
    RAISE EXCEPTION 'Invalid report payload' USING ERRCODE = '23514';
  END IF;

  IF p_target_type = 'POST' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE id = p_target_id
        AND moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) INTO target_exists;
  ELSIF p_target_type = 'COMMENT' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.community_comments
      WHERE id = p_target_id
        AND moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) INTO target_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.umkm_request_responses
      WHERE id = p_target_id
        AND moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) INTO target_exists;
  END IF;

  IF NOT target_exists THEN
    RAISE EXCEPTION 'Report target not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.community_reports (
    reporter_user_id,
    target_type,
    target_id,
    reason,
    details
  )
  VALUES (
    current_user_id,
    p_target_type,
    p_target_id,
    p_reason,
    NULLIF(btrim(COALESCE(p_details, '')), '')
  )
  ON CONFLICT (reporter_user_id, target_type, target_id, reason)
  DO UPDATE SET details = EXCLUDED.details
  RETURNING * INTO report_row;

  IF p_target_type = 'POST' THEN
    UPDATE public.community_posts
    SET moderation_status = 'UNDER_REVIEW'
    WHERE id = p_target_id
      AND moderation_status = 'ACTIVE';
  ELSIF p_target_type = 'COMMENT' THEN
    UPDATE public.community_comments
    SET moderation_status = 'UNDER_REVIEW'
    WHERE id = p_target_id
      AND moderation_status = 'ACTIVE';
  ELSE
    UPDATE public.umkm_request_responses
    SET moderation_status = 'UNDER_REVIEW'
    WHERE id = p_target_id
      AND moderation_status = 'ACTIVE';
  END IF;

  RETURN QUERY
  SELECT
    report_row.id,
    report_row.target_type,
    report_row.target_id,
    report_row.reason,
    report_row.details,
    report_row.status,
    report_row.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_community_reports_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  reporter_user_id UUID,
  reporter_display_name TEXT,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  details TEXT,
  status TEXT,
  moderation_action TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.community_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH paged AS (
    SELECT report.*, COUNT(*) OVER() AS total_count
    FROM public.community_reports AS report
    WHERE p_status IS NULL OR report.status = p_status
    ORDER BY report.created_at DESC, report.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    paged.id,
    paged.reporter_user_id,
    profile.display_name AS reporter_display_name,
    paged.target_type,
    paged.target_id,
    paged.reason,
    paged.details,
    paged.status,
    paged.moderation_action,
    paged.reviewed_by,
    paged.reviewed_at,
    paged.created_at,
    paged.total_count
  FROM paged
  LEFT JOIN public.profiles AS profile
    ON profile.id = paged.reporter_user_id
  ORDER BY paged.created_at DESC, paged.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_community_target_v1(
  p_report_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_row public.community_reports%ROWTYPE;
  next_status TEXT;
BEGIN
  IF NOT public.community_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('HIDE', 'REMOVE', 'RESTORE', 'DISMISS') THEN
    RAISE EXCEPTION 'Invalid moderation action' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO report_row
  FROM public.community_reports
  WHERE id = p_report_id;

  IF report_row.id IS NULL THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;

  next_status := CASE p_action
    WHEN 'HIDE' THEN 'HIDDEN'
    WHEN 'REMOVE' THEN 'REMOVED'
    WHEN 'RESTORE' THEN 'ACTIVE'
    ELSE NULL
  END;

  IF next_status IS NOT NULL THEN
    IF report_row.target_type = 'POST' THEN
      UPDATE public.community_posts
      SET moderation_status = next_status
      WHERE id = report_row.target_id;
    ELSIF report_row.target_type = 'COMMENT' THEN
      UPDATE public.community_comments
      SET moderation_status = next_status
      WHERE id = report_row.target_id;
    ELSE
      UPDATE public.umkm_request_responses
      SET moderation_status = next_status
      WHERE id = report_row.target_id;
    END IF;
  END IF;

  UPDATE public.community_reports
  SET
    status = CASE WHEN p_action = 'DISMISS' THEN 'DISMISSED' ELSE 'ACTIONED' END,
    moderation_action = p_action,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_reputation_v1(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  confirmed_contributions INTEGER,
  helpful_received INTEGER,
  findings_count INTEGER,
  reputation_label TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      profile.id AS user_id,
      COUNT(DISTINCT confirmed.id) FILTER (WHERE confirmed.id IS NOT NULL)::INTEGER AS confirmed_contributions,
      COUNT(DISTINCT helpful.id) FILTER (WHERE helpful.id IS NOT NULL)::INTEGER AS helpful_received,
      COUNT(DISTINCT finding.id) FILTER (WHERE finding.id IS NOT NULL)::INTEGER AS findings_count
    FROM public.profiles AS profile
    LEFT JOIN public.community_posts AS post
      ON post.author_id = profile.id
      AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    LEFT JOIN public.community_reactions AS confirmed
      ON confirmed.post_id = post.id
      AND confirmed.reaction_type = 'CONFIRMED'
      AND confirmed.user_id <> profile.id
    LEFT JOIN public.community_reactions AS helpful
      ON helpful.post_id = post.id
      AND helpful.reaction_type = 'HELPFUL'
      AND helpful.user_id <> profile.id
    LEFT JOIN public.community_posts AS finding
      ON finding.author_id = profile.id
      AND finding.post_type = 'FINDING'
      AND finding.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    WHERE profile.id = p_user_id
    GROUP BY profile.id
  )
  SELECT
    stats.user_id,
    stats.confirmed_contributions,
    stats.helpful_received,
    stats.findings_count,
    CASE
      WHEN stats.confirmed_contributions >= 10 OR stats.helpful_received >= 20
        THEN 'Kontributor Tepercaya'
      WHEN stats.confirmed_contributions >= 3 OR stats.helpful_received >= 5 OR stats.findings_count >= 5
        THEN 'Kontributor Aktif'
      ELSE 'Kontributor Baru'
    END AS reputation_label
  FROM stats;
$$;

CREATE OR REPLACE FUNCTION public.get_community_analytics_v1()
RETURNS TABLE (
  active_posts INTEGER,
  active_findings INTEGER,
  active_requests INTEGER,
  active_signals INTEGER,
  umkm_responses INTEGER,
  open_reports INTEGER,
  unread_notifications INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF NOT public.community_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*)::INTEGER
      FROM public.community_posts
      WHERE moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) AS active_posts,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.community_posts
      WHERE post_type = 'FINDING'
        AND moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) AS active_findings,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.commuter_requests
      WHERE status = 'ACTIVE'
    ) AS active_requests,
    (
      SELECT COUNT(*)::INTEGER
      FROM (
        SELECT cluster.id
        FROM public.community_demand_signal_clusters AS cluster
        JOIN public.community_demand_signal_members AS member
          ON member.signal_id = cluster.id
        JOIN public.commuter_requests AS request
          ON request.id = member.request_id
        WHERE request.status = 'ACTIVE'
        GROUP BY cluster.id
        HAVING COUNT(DISTINCT request.id) >= 3
      ) AS active_cluster
    ) AS active_signals,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.umkm_request_responses
      WHERE moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ) AS umkm_responses,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.community_reports
      WHERE status = 'OPEN'
    ) AS open_reports,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.community_notifications
      WHERE recipient_user_id = auth.uid()
        AND read_at IS NULL
    ) AS unread_notifications;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_feed_v4(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_post_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  media_id UUID,
  media_storage_path TEXT,
  media_mime_type TEXT,
  media_size_bytes INTEGER,
  media_width INTEGER,
  media_height INTEGER,
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[],
  reply_count INTEGER,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  WITH paged_posts AS (
    SELECT post.*, COUNT(*) OVER() AS total_count
    FROM public.community_posts AS post
    WHERE (p_post_type IS NULL OR post.post_type = p_post_type)
      AND (p_category IS NULL OR post.category = p_category)
      AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ORDER BY post.created_at DESC, post.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    post.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    media.media_id,
    media.media_storage_path,
    media.media_mime_type,
    media.media_size_bytes,
    media.media_width,
    media.media_height,
    reactions.helpful_count,
    reactions.interesting_count,
    reactions.confirmed_count,
    reactions.viewer_reactions,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count,
    post.total_count
  FROM paged_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL (
    SELECT
      media_row.id AS media_id,
      media_row.storage_path AS media_storage_path,
      media_row.mime_type AS media_mime_type,
      media_row.size_bytes AS media_size_bytes,
      media_row.width AS media_width,
      media_row.height AS media_height
    FROM public.community_media AS media_row
    WHERE media_row.post_id = post.id
    ORDER BY media_row.created_at ASC, media_row.id ASC
    LIMIT 1
  ) AS media ON TRUE
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
      AND comment.moderation_status NOT IN ('HIDDEN', 'REMOVED')
  ) AS comments ON TRUE
  ORDER BY post.created_at DESC, post.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_community_post_detail_v2(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  media_id UUID,
  media_storage_path TEXT,
  media_mime_type TEXT,
  media_size_bytes INTEGER,
  media_width INTEGER,
  media_height INTEGER,
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[],
  reply_count INTEGER,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    post.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    media.media_id,
    media.media_storage_path,
    media.media_mime_type,
    media.media_size_bytes,
    media.media_width,
    media.media_height,
    reactions.helpful_count,
    reactions.interesting_count,
    reactions.confirmed_count,
    reactions.viewer_reactions,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count,
    1::BIGINT AS total_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL (
    SELECT
      media_row.id AS media_id,
      media_row.storage_path AS media_storage_path,
      media_row.mime_type AS media_mime_type,
      media_row.size_bytes AS media_size_bytes,
      media_row.width AS media_width,
      media_row.height AS media_height
    FROM public.community_media AS media_row
    WHERE media_row.post_id = post.id
    ORDER BY media_row.created_at ASC, media_row.id ASC
    LIMIT 1
  ) AS media ON TRUE
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
      AND comment.moderation_status NOT IN ('HIDDEN', 'REMOVED')
  ) AS comments ON TRUE
  WHERE post.id = p_post_id
    AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED');
$$;

CREATE OR REPLACE FUNCTION public.list_community_comments_v1(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  author_id UUID,
  parent_comment_id UUID,
  content TEXT,
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  total_root_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  WITH paged_roots AS (
    SELECT
      comment.*,
      COUNT(*) OVER() AS total_root_count
    FROM public.community_comments AS comment
    JOIN public.community_posts AS post ON post.id = comment.post_id
    WHERE comment.post_id = p_post_id
      AND comment.parent_comment_id IS NULL
      AND comment.moderation_status NOT IN ('HIDDEN', 'REMOVED')
      AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    ORDER BY comment.created_at DESC, comment.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  ),
  selected_comments AS (
    SELECT * FROM paged_roots
    UNION ALL
    SELECT child.*, root.total_root_count
    FROM public.community_comments AS child
    JOIN paged_roots AS root
      ON child.parent_comment_id = root.id
    WHERE child.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    UNION ALL
    SELECT grandchild.*, root.total_root_count
    FROM public.community_comments AS child
    JOIN paged_roots AS root
      ON child.parent_comment_id = root.id
    JOIN public.community_comments AS grandchild
      ON grandchild.parent_comment_id = child.id
    WHERE child.moderation_status NOT IN ('HIDDEN', 'REMOVED')
      AND grandchild.moderation_status NOT IN ('HIDDEN', 'REMOVED')
  )
  SELECT
    comment.id,
    comment.post_id,
    comment.author_id,
    comment.parent_comment_id,
    comment.content,
    comment.depth,
    comment.created_at,
    comment.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    comment.total_root_count
  FROM selected_comments AS comment
  LEFT JOIN public.profiles AS profile
    ON profile.id = comment.author_id
  ORDER BY
    COALESCE(comment.parent_comment_id, comment.id),
    comment.depth,
    comment.created_at ASC,
    comment.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_community_cultural_map_v1(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_categories TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  author_display_name TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  confirmed_count INTEGER,
  reply_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF p_west < -180 OR p_west > 180
    OR p_east < -180 OR p_east > 180
    OR p_south < -90 OR p_south > 90
    OR p_north < -90 OR p_north > 90
    OR p_south >= p_north
    OR p_west >= p_east THEN
    RAISE EXCEPTION 'Invalid bbox' USING ERRCODE = '23514';
  END IF;

  RETURN QUERY
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    profile.display_name AS author_display_name,
    CASE
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    reactions.confirmed_count,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
      AND comment.moderation_status NOT IN ('HIDDEN', 'REMOVED')
  ) AS comments ON TRUE
  WHERE post.post_type = 'FINDING'
    AND post.location IS NOT NULL
    AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED')
    AND (p_categories IS NULL OR post.category = ANY(p_categories))
    AND ST_Intersects(
      post.location,
      ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    )
  ORDER BY post.created_at DESC, post.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
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
    AND response.moderation_status NOT IN ('HIDDEN', 'REMOVED')
  ORDER BY response.updated_at DESC, response.id DESC;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_realtime_events;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.community_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_emit_realtime_event(TEXT, TEXT, UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_create_notification(UUID, UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_community_notifications_v1(INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_community_unread_notifications_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_community_notification_read_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_community_notifications_read_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_community_report_v1(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_admin_community_reports_v1(INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_community_target_v1(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_reputation_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_analytics_v1() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.community_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_notifications_v1(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_community_unread_notifications_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_community_notification_read_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_community_notifications_read_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_report_v1(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_community_reports_v1(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_community_target_v1(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_reputation_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_analytics_v1() TO authenticated;

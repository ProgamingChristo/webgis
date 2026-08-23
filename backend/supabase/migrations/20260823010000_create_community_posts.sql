CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_posts_content_not_blank CHECK (char_length(btrim(content)) > 0),
  CONSTRAINT community_posts_content_max_length CHECK (char_length(content) <= 500)
);

CREATE INDEX IF NOT EXISTS community_posts_created_at_idx
  ON public.community_posts (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS community_posts_author_id_idx
  ON public.community_posts (author_id);

DROP TRIGGER IF EXISTS handle_updated_at_community_posts ON public.community_posts;

CREATE TRIGGER handle_updated_at_community_posts
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'community_posts_authenticated_read'
  ) THEN
    CREATE POLICY community_posts_authenticated_read
      ON public.community_posts
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'community_posts_insert_own'
  ) THEN
    CREATE POLICY community_posts_insert_own
      ON public.community_posts
      FOR INSERT
      TO authenticated
      WITH CHECK (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'community_posts_update_own'
  ) THEN
    CREATE POLICY community_posts_update_own
      ON public.community_posts
      FOR UPDATE
      TO authenticated
      USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.community_posts TO authenticated;

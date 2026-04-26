-- EVZA Gallery - Likes e comentários nos Estados
-- Executar no Supabase SQL Editor

ALTER TABLE status_items ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS status_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid REFERENCES status_items(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (status_id, device_id)
);

CREATE TABLE IF NOT EXISTS status_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid REFERENCES status_items(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES status_comments(id) ON DELETE CASCADE,
  author text NOT NULL,
  body text NOT NULL CHECK (char_length(body) <= 500),
  likes integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status_comment_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES status_comments(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_status_likes_status ON status_likes(status_id);
CREATE INDEX IF NOT EXISTS idx_status_comments_status ON status_comments(status_id);
CREATE INDEX IF NOT EXISTS idx_status_comments_parent ON status_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_status_comment_likes_comment ON status_comment_likes(comment_id);

ALTER TABLE status_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anyone_status_like ON status_likes;
DROP POLICY IF EXISTS anyone_read_status_likes ON status_likes;
DROP POLICY IF EXISTS public_read_status_comments ON status_comments;
DROP POLICY IF EXISTS anyone_status_comment ON status_comments;
DROP POLICY IF EXISTS admin_all_status_comments ON status_comments;
DROP POLICY IF EXISTS anyone_status_comment_like ON status_comment_likes;
DROP POLICY IF EXISTS anyone_read_status_comment_likes ON status_comment_likes;

CREATE POLICY anyone_status_like ON status_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_status_likes ON status_likes FOR SELECT USING (true);
CREATE POLICY public_read_status_comments ON status_comments FOR SELECT USING (approved = true);
CREATE POLICY anyone_status_comment ON status_comments FOR INSERT WITH CHECK (true);
CREATE POLICY admin_all_status_comments ON status_comments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY anyone_status_comment_like ON status_comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_status_comment_likes ON status_comment_likes FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION sync_status_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE status_items SET likes = coalesce(likes, 0) + 1 WHERE id = NEW.status_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE status_items SET likes = greatest(coalesce(likes, 0) - 1, 0) WHERE id = OLD.status_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_status_like_count ON status_likes;
CREATE TRIGGER trg_sync_status_like_count
AFTER INSERT OR DELETE ON status_likes
FOR EACH ROW EXECUTE FUNCTION sync_status_like_count();

CREATE OR REPLACE FUNCTION sync_status_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE status_comments SET likes = coalesce(likes, 0) + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE status_comments SET likes = greatest(coalesce(likes, 0) - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_status_comment_like_count ON status_comment_likes;
CREATE TRIGGER trg_sync_status_comment_like_count
AFTER INSERT OR DELETE ON status_comment_likes
FOR EACH ROW EXECUTE FUNCTION sync_status_comment_like_count();

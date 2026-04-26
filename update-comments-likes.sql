-- EVZA Gallery - actualizar projecto existente para respostas e likes
-- Executar no Supabase SQL Editor

ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE comments ALTER COLUMN approved SET DEFAULT true;

CREATE TABLE IF NOT EXISTS catalog_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id uuid REFERENCES catalogs(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (catalog_id, device_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_catalog_likes_catalog ON catalog_likes(catalog_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);

ALTER TABLE catalog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anyone_catalog_like ON catalog_likes;
DROP POLICY IF EXISTS anyone_read_catalog_likes ON catalog_likes;
DROP POLICY IF EXISTS anyone_comment_like ON comment_likes;
DROP POLICY IF EXISTS anyone_read_comment_likes ON comment_likes;

CREATE POLICY anyone_catalog_like ON catalog_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_catalog_likes ON catalog_likes FOR SELECT USING (true);
CREATE POLICY anyone_comment_like ON comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_comment_likes ON comment_likes FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION sync_catalog_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE catalogs SET likes = coalesce(likes, 0) + 1 WHERE id = NEW.catalog_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE catalogs SET likes = greatest(coalesce(likes, 0) - 1, 0) WHERE id = OLD.catalog_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_catalog_like_count ON catalog_likes;
CREATE TRIGGER trg_sync_catalog_like_count
AFTER INSERT OR DELETE ON catalog_likes
FOR EACH ROW EXECUTE FUNCTION sync_catalog_like_count();

CREATE OR REPLACE FUNCTION sync_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes = coalesce(likes, 0) + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes = greatest(coalesce(likes, 0) - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_like_count ON comment_likes;
CREATE TRIGGER trg_sync_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION sync_comment_like_count();

UPDATE comments SET approved = true WHERE approved = false;

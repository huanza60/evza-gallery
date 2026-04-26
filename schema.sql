-- ============================================
-- EVZA Gallery v2 - Schema Supabase
-- Executar no SQL Editor do Supabase
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS catalogs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  event_date      date,
  cover_url       text,
  drive_folder_id text,
  likes           integer DEFAULT 0,
  views           integer DEFAULT 0,
  is_featured     boolean DEFAULT false,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS media_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id    uuid REFERENCES catalogs(id) ON DELETE CASCADE,
  type          text CHECK (type IN ('photo', 'video')) NOT NULL,
  src_url       text NOT NULL,
  poster_url    text,
  caption       text,
  storage_path  text,
  drive_file_id text,
  likes         integer DEFAULT 0,
  views         integer DEFAULT 0,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id   uuid REFERENCES media_items(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  author     text NOT NULL,
  body       text NOT NULL CHECK (char_length(body) <= 500),
  likes      integer DEFAULT 0,
  is_admin   boolean DEFAULT false,
  approved   boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id   uuid REFERENCES media_items(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (media_id, device_id)
);

CREATE TABLE IF NOT EXISTS catalog_likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id uuid REFERENCES catalogs(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (catalog_id, device_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, device_id)
);

CREATE TABLE IF NOT EXISTS status_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text CHECK (type IN ('photo', 'video')) NOT NULL,
  src_url text NOT NULL,
  poster_url text,
  caption text,
  storage_path text,
  drive_file_id text,
  likes integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

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

CREATE INDEX IF NOT EXISTS idx_media_catalog ON media_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalogs_date ON catalogs(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_comments_media ON comments(media_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_likes_media ON likes(media_id);
CREATE INDEX IF NOT EXISTS idx_catalog_likes_catalog ON catalog_likes(catalog_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_status_active ON status_items(expires_at DESC);

ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read ON catalogs;
DROP POLICY IF EXISTS public_read ON media_items;
DROP POLICY IF EXISTS public_read_approved ON comments;
DROP POLICY IF EXISTS admin_all ON catalogs;
DROP POLICY IF EXISTS admin_all ON media_items;
DROP POLICY IF EXISTS admin_moderate ON comments;
DROP POLICY IF EXISTS anyone_comment ON comments;
DROP POLICY IF EXISTS anyone_like ON likes;
DROP POLICY IF EXISTS anyone_read_likes ON likes;
DROP POLICY IF EXISTS anyone_catalog_like ON catalog_likes;
DROP POLICY IF EXISTS anyone_read_catalog_likes ON catalog_likes;
DROP POLICY IF EXISTS anyone_comment_like ON comment_likes;
DROP POLICY IF EXISTS anyone_read_comment_likes ON comment_likes;
DROP POLICY IF EXISTS public_read_status ON status_items;
DROP POLICY IF EXISTS admin_all_status ON status_items;

CREATE POLICY public_read ON catalogs FOR SELECT USING (true);
CREATE POLICY public_read ON media_items FOR SELECT USING (true);
CREATE POLICY public_read_approved ON comments FOR SELECT USING (approved = true);
CREATE POLICY admin_all ON catalogs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY admin_all ON media_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY admin_moderate ON comments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY anyone_comment ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_like ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_likes ON likes FOR SELECT USING (true);
CREATE POLICY anyone_catalog_like ON catalog_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_catalog_likes ON catalog_likes FOR SELECT USING (true);
CREATE POLICY anyone_comment_like ON comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY anyone_read_comment_likes ON comment_likes FOR SELECT USING (true);
CREATE POLICY public_read_status ON status_items FOR SELECT USING (expires_at > now());
CREATE POLICY admin_all_status ON status_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION increment_catalog_views(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS
$$ UPDATE catalogs SET views = coalesce(views, 0) + 1 WHERE id = p_id; $$;

CREATE OR REPLACE FUNCTION increment_media_views(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS
$$ UPDATE media_items SET views = coalesce(views, 0) + 1 WHERE id = p_id; $$;

CREATE OR REPLACE FUNCTION increment_media_likes(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS
$$ UPDATE media_items SET likes = coalesce(likes, 0) + 1 WHERE id = p_id; $$;

CREATE OR REPLACE FUNCTION increment_catalog_likes(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS
$$ UPDATE catalogs SET likes = coalesce(likes, 0) + 1 WHERE id = p_id; $$;

CREATE OR REPLACE FUNCTION increment_comment_likes(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS
$$ UPDATE comments SET likes = coalesce(likes, 0) + 1 WHERE id = p_id; $$;

CREATE OR REPLACE FUNCTION sync_media_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE media_items SET likes = coalesce(likes, 0) + 1 WHERE id = NEW.media_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE media_items SET likes = greatest(coalesce(likes, 0) - 1, 0) WHERE id = OLD.media_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_media_like_count ON likes;
CREATE TRIGGER trg_sync_media_like_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION sync_media_like_count();

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

ALTER TABLE catalogs
  ADD COLUMN IF NOT EXISTS search_vec tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,''))) STORED;

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS search_vec tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(caption,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_catalog_fts ON catalogs USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS idx_media_fts ON media_items USING GIN (search_vec);

INSERT INTO storage.buckets (id, name, public)
VALUES ('evza-media', 'evza-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS public_read_storage ON storage.objects;
DROP POLICY IF EXISTS admin_upload_storage ON storage.objects;
DROP POLICY IF EXISTS admin_update_storage ON storage.objects;
DROP POLICY IF EXISTS admin_delete_storage ON storage.objects;

CREATE POLICY public_read_storage ON storage.objects FOR SELECT USING (bucket_id = 'evza-media');
CREATE POLICY admin_upload_storage ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evza-media' AND auth.role() = 'authenticated');
CREATE POLICY admin_update_storage ON storage.objects FOR UPDATE USING (bucket_id = 'evza-media' AND auth.role() = 'authenticated');
CREATE POLICY admin_delete_storage ON storage.objects FOR DELETE USING (bucket_id = 'evza-media' AND auth.role() = 'authenticated');

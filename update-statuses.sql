-- EVZA Gallery - Estados/Reels na página inicial
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS status_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text CHECK (type IN ('photo', 'video')) NOT NULL,
  src_url text NOT NULL,
  poster_url text,
  caption text,
  storage_path text,
  drive_file_id text,
  expires_at timestamptz NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_status_active ON status_items(expires_at DESC);

ALTER TABLE status_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_status ON status_items;
DROP POLICY IF EXISTS admin_all_status ON status_items;

CREATE POLICY public_read_status ON status_items
FOR SELECT USING (expires_at > now());

CREATE POLICY admin_all_status ON status_items
FOR ALL USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

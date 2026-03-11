-- Phase 2 migration: persistence, world seeds, multiplayer support
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/imcydtpxnjzjxohvdspc/sql/new

-- 1. Game clock persistence
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS saved_hour   integer DEFAULT 8;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS saved_minute integer DEFAULT 0;

-- 2. World config (generated NPC customizations + town name stored per-world)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS world_config jsonb;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS town_name    text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS vibe         text DEFAULT 'quiet';

-- 3. World templates (shared across games with same seed — enables seed sharing)
CREATE TABLE IF NOT EXISTS public.world_templates (
  seed       integer  PRIMARY KEY,
  town_name  text     NOT NULL,
  vibe       text     DEFAULT 'quiet',
  npc_config jsonb    NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- Anyone can read templates (for seed sharing), only authenticated users can create
ALTER TABLE public.world_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read world templates"   ON public.world_templates FOR SELECT USING (true);
CREATE POLICY "Auth users create templates"   ON public.world_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Enable Realtime for multiplayer presence (games channel)
-- No table needed — uses Supabase Realtime presence API
-- Just make sure Realtime is enabled for the project in the dashboard.

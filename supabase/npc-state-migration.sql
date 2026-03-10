-- Caro RPG — NPC Dynamic State Migration
-- Run this in: https://supabase.com/dashboard/project/imcydtpxnjzjxohvdspc/sql/new

-- NPC emotional state + relationship with player (per game, per NPC)
create table if not exists public.npc_state (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games on delete cascade not null,
  npc_id text not null,
  user_id uuid references auth.users on delete cascade not null,

  -- Emotional state (dynamic, changes over time)
  mood text default 'neutral'
    check (mood in ('joyful','content','neutral','melancholy','anxious','angry','grieving')),
  energy text default 'energized'
    check (energy in ('energized','tired','exhausted')),
  stress text default 'calm'
    check (stress in ('calm','uneasy','overwhelmed')),
  preoccupation text,         -- "worried about the harvest", "excited about the festival", etc.

  -- Relationship with the player
  trust integer default 0 check (trust >= 0 and trust <= 100),
  fondness integer default 0 check (fondness >= 0 and fondness <= 100),
  times_spoken integer default 0,
  last_spoke_at timestamptz,

  -- Notable moments / AI-generated memory summary
  history text[] default '{}',
  memory_summary text default '',

  updated_at timestamptz default now(),
  unique(game_id, npc_id, user_id)
);

alter table public.npc_state enable row level security;
create policy "Users can manage own npc state"
  on public.npc_state for all using (auth.uid() = user_id);

create trigger npc_state_updated_at before update on public.npc_state
  for each row execute procedure public.handle_updated_at();

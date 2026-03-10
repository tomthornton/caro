-- Caro RPG — Supabase Schema
-- Run this in Supabase SQL editor

-- Profiles (public user data)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Games
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  world_seed integer default floor(random() * 1000000),
  day integer default 1,
  time_of_day text default 'morning',
  created_at timestamptz default now(),
  last_played_at timestamptz default now()
);
alter table public.games enable row level security;
create policy "Users can manage own games" on public.games for all using (auth.uid() = user_id);

-- Characters
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  archetype text not null,
  stats jsonb not null default '{"strength":3,"intellect":3,"charisma":3,"cooking":2,"crafting":2,"reputation":5,"wisdom":2}',
  position jsonb default '{"x":400,"y":300}',
  inventory jsonb default '[]',
  energy integer default 100,
  max_energy integer default 100,
  gold integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.characters enable row level security;
create policy "Users can manage own characters" on public.characters for all using (auth.uid() = user_id);

-- NPC Memories (what each NPC knows/feels about the player, per game)
create table if not exists public.npc_memories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games on delete cascade not null,
  npc_id text not null,
  user_id uuid references auth.users on delete cascade not null,
  memory_summary text default '',
  relationship_level integer default 0,
  total_conversations integer default 0,
  updated_at timestamptz default now(),
  unique(game_id, npc_id, user_id)
);
alter table public.npc_memories enable row level security;
create policy "Users can manage own npc memories" on public.npc_memories for all using (auth.uid() = user_id);

-- Chat Logs (conversation history per NPC per game)
create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games on delete cascade not null,
  npc_id text not null,
  user_id uuid references auth.users on delete cascade not null,
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(game_id, npc_id, user_id)
);
alter table public.chat_logs enable row level security;
create policy "Users can manage own chat logs" on public.chat_logs for all using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger characters_updated_at before update on public.characters
  for each row execute procedure public.handle_updated_at();
create trigger npc_memories_updated_at before update on public.npc_memories
  for each row execute procedure public.handle_updated_at();
create trigger chat_logs_updated_at before update on public.chat_logs
  for each row execute procedure public.handle_updated_at();

-- Supabase schema for v0.2. Run in Supabase SQL editor.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',
  generations_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business text not null,
  product text not null,
  platform text not null,
  goal text not null,
  tone text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table ads enable row level security;

create policy "profiles own row" on profiles for select using (auth.uid() = id);
create policy "ads own rows" on ads for select using (auth.uid() = user_id);
create policy "ads own insert" on ads for insert with check (auth.uid() = user_id);
create policy "ads own delete" on ads for delete using (auth.uid() = user_id);

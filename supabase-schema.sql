-- ── 1. PROFILES TABLE ──────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'user' check (role in ('user', 'admin')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. RECIPES TABLE ───────────────────────────────────────
create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  image        text,
  description  text,
  category     text check (category in ('chicken','beef','seafood','veg')),
  cuisine      text check (cuisine in ('pakistani','italian','chinese','turkish','american','thai','french')),
  meal_type    text check (meal_type in ('breakfast','lunch','dinner','dessert')),
  ingredients  text[] not null default '{}',
  steps        text[] not null default '{}',
  cooking_time text,
  author_id    uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ── 3. SAVED RECIPES TABLE ─────────────────────────────────
create table if not exists public.saved_recipes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ── 4. ROW LEVEL SECURITY ──────────────────────────────────

-- Profiles: public read, own write
alter table public.profiles enable row level security;
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Recipes: public read, auth write own, admin all
alter table public.recipes enable row level security;
create policy "Recipes are publicly readable"
  on public.recipes for select using (true);
create policy "Authenticated users can insert recipes"
  on public.recipes for insert with check (auth.uid() = author_id);
create policy "Authors can update own recipes"
  on public.recipes for update using (auth.uid() = author_id);
create policy "Authors can delete own recipes"
  on public.recipes for delete using (auth.uid() = author_id);
create policy "Admins can update any recipe"
  on public.recipes for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins can delete any recipe"
  on public.recipes for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Saved recipes: own only
alter table public.saved_recipes enable row level security;
create policy "Users can view own saved recipes"
  on public.saved_recipes for select using (auth.uid() = user_id);
create policy "Users can save recipes"
  on public.saved_recipes for insert with check (auth.uid() = user_id);
create policy "Users can unsave recipes"
  on public.saved_recipes for delete using (auth.uid() = user_id);

-- Recipes with author name (useful for admin table)
create or replace view public.recipes_with_author as
  select
    r.*,
    p.name as author_name,
    p.role as author_role
  from public.recipes r
  left join public.profiles p on r.author_id = p.id;

-- User recipe counts (useful for admin users table)
create or replace view public.user_recipe_counts as
  select
    p.id,
    p.name,
    p.role,
    p.created_at,
    count(r.id) as recipe_count
  from public.profiles p
  left join public.recipes r on r.author_id = p.id
  group by p.id, p.name, p.role, p.created_at;

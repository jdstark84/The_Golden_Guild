create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  image_url text,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.posts
add column if not exists image_url text;

alter table public.posts
add column if not exists image_path text;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

insert into storage.buckets (id, name, public)
values ('artwork', 'artwork', true)
on conflict (id) do update set public = true;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
using (true);

drop policy if exists "Members can create their own profile" on public.profiles;
create policy "Members can create their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
on public.posts for select
using (true);

drop policy if exists "Members can write their own posts" on public.posts;
create policy "Members can write their own posts"
on public.posts for insert
with check (auth.uid() = author_id);

drop policy if exists "Members can edit their own posts" on public.posts;
create policy "Members can edit their own posts"
on public.posts for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Members can delete their own posts" on public.posts;
create policy "Members can delete their own posts"
on public.posts for delete
using (auth.uid() = author_id);

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments for select
using (true);

drop policy if exists "Members can comment as themselves" on public.comments;
create policy "Members can comment as themselves"
on public.comments for insert
with check (auth.uid() = author_id);

drop policy if exists "Members can edit their own comments" on public.comments;
create policy "Members can edit their own comments"
on public.comments for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Members can delete their own comments" on public.comments;
create policy "Members can delete their own comments"
on public.comments for delete
using (auth.uid() = author_id);

drop policy if exists "Artwork is publicly readable" on storage.objects;
create policy "Artwork is publicly readable"
on storage.objects for select
using (bucket_id = 'artwork');

drop policy if exists "Members can upload artwork" on storage.objects;
create policy "Members can upload artwork"
on storage.objects for insert
with check (bucket_id = 'artwork' and auth.role() = 'authenticated');

drop policy if exists "Members can update their own artwork" on storage.objects;
create policy "Members can update their own artwork"
on storage.objects for update
using (bucket_id = 'artwork' and owner = auth.uid())
with check (bucket_id = 'artwork' and owner = auth.uid());

drop policy if exists "Members can delete their own artwork" on storage.objects;
create policy "Members can delete their own artwork"
on storage.objects for delete
using (bucket_id = 'artwork' and owner = auth.uid());

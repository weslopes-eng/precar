-- Precar · rode no SQL Editor do Supabase (uma vez)

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  model text not null,
  version text not null default '',
  year text not null,
  condition text not null check (condition in ('0km', 'seminovo')),
  price integer not null check (price > 0),
  body text not null default 'hatch',
  fuel text not null default 'Flex',
  transmission text not null default 'Manual',
  power text not null default '',
  consumption text not null default '',
  trunk text not null default '',
  wm text not null default '',
  image text,
  photos jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cars_price_idx on public.cars (price);
create index if not exists cars_published_idx on public.cars (published);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cars_updated on public.cars;
create trigger cars_updated
before update on public.cars
for each row execute function public.set_updated_at();

alter table public.cars enable row level security;

drop policy if exists "public read published cars" on public.cars;
create policy "public read published cars"
on public.cars for select
to anon, authenticated
using (published = true);

drop policy if exists "auth read all cars" on public.cars;
create policy "auth read all cars"
on public.cars for select
to authenticated
using (true);

drop policy if exists "auth write cars" on public.cars;
create policy "auth write cars"
on public.cars for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('cars', 'cars', true)
on conflict (id) do nothing;

drop policy if exists "public read car photos" on storage.objects;
create policy "public read car photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'cars');

drop policy if exists "auth upload car photos" on storage.objects;
create policy "auth upload car photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'cars');

drop policy if exists "auth update car photos" on storage.objects;
create policy "auth update car photos"
on storage.objects for update
to authenticated
using (bucket_id = 'cars')
with check (bucket_id = 'cars');

drop policy if exists "auth delete car photos" on storage.objects;
create policy "auth delete car photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'cars');

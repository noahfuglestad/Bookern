create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text unique not null,
  name text not null,
  category text,
  city text,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 30,
  price_text text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  booking_date date not null,
  start_time time not null,
  customer_name text not null,
  customer_contact text not null,
  note text,
  status text not null default 'booked' check (status in ('booked', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (company_id, booking_date, start_time)
);

alter table public.companies enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "Published companies are readable" on public.companies;
create policy "Published companies are readable"
  on public.companies for select
  using (is_published = true or owner_id = auth.uid());

drop policy if exists "Public can create companies" on public.companies;
drop policy if exists "Owners can create companies" on public.companies;
create policy "Owners can create companies"
  on public.companies for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists "Owners can update companies" on public.companies;
create policy "Owners can update companies"
  on public.companies for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Active services are readable" on public.services;
create policy "Active services are readable"
  on public.services for select
  using (
    is_active = true
    and exists (
      select 1 from public.companies
      where companies.id = services.company_id
      and (companies.is_published = true or companies.owner_id = auth.uid())
    )
  );

drop policy if exists "Public can create services" on public.services;
drop policy if exists "Owners can create services" on public.services;
create policy "Owners can create services"
  on public.services for insert
  with check (
    is_active = true
    and exists (
      select 1 from public.companies
      where companies.id = services.company_id
      and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update services" on public.services;
create policy "Owners can update services"
  on public.services for update
  using (
    exists (
      select 1 from public.companies
      where companies.id = services.company_id
      and companies.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.companies
      where companies.id = services.company_id
      and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can read appointments" on public.appointments;
create policy "Owners can read appointments"
  on public.appointments for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = appointments.company_id
      and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "Public can create appointments" on public.appointments;
create policy "Public can create appointments"
  on public.appointments for insert
  with check (
    exists (
      select 1 from public.companies
      where companies.id = appointments.company_id
      and companies.is_published = true
    )
  );

drop function if exists public.get_booked_slots(uuid);
create function public.get_booked_slots(target_company_id uuid)
returns table (
  company_id uuid,
  booking_date date,
  start_time time
)
language sql
security definer
set search_path = public
as $$
  select appointments.company_id, appointments.booking_date, appointments.start_time
  from public.appointments
  join public.companies on companies.id = appointments.company_id
  where appointments.company_id = target_company_id
    and appointments.status in ('booked', 'confirmed')
    and companies.is_published = true;
$$;

insert into public.companies (slug, name, category, city, description)
values
  ('nord-frisor', 'Nord Frisør', 'Frisør', 'Oslo sentrum', 'Klipp, styling og raske konsultasjoner for hverdagen.'),
  ('luna-velvaere', 'Luna Velvære', 'Velvære', 'Bergen', 'Rolige behandlinger, oppfølging og personlig pleie.'),
  ('fjord-fysio', 'Fjord Fysio', 'Helse', 'Trondheim', 'Fysioterapi, vurdering og korte oppfølgingstimer.')
on conflict (slug) do nothing;

insert into public.services (company_id, name, duration_minutes, price_text, sort_order)
select companies.id, service.name, service.duration_minutes, service.price_text, service.sort_order
from public.companies
cross join (
  values
    ('Konsultasjon', 30, '490 kr', 1),
    ('Standard time', 45, '690 kr', 2),
    ('Oppfølging', 30, '390 kr', 3)
) as service(name, duration_minutes, price_text, sort_order)
where companies.slug in ('nord-frisor', 'luna-velvaere', 'fjord-fysio')
on conflict do nothing;

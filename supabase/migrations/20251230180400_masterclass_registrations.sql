-- Create a table for masterclass registrations
create table if not exists public.masterclass_registrations (
    id uuid default gen_random_uuid() primary key,
    event_id uuid not null references public.events(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    status text default 'registered',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- Ensure a user can only register once per event
    unique(event_id, user_id)
);

-- Enable RLS
alter table public.masterclass_registrations enable row level security;

-- Policies
-- Policies
do $$
begin
  if not exists (
    select from pg_policies where tablename = 'masterclass_registrations' and policyname = 'Users can view their own registrations'
  ) then
    create policy "Users can view their own registrations"
      on public.masterclass_registrations for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select from pg_policies where tablename = 'masterclass_registrations' and policyname = 'Users can insert their own registrations'
  ) then
    create policy "Users can insert their own registrations"
      on public.masterclass_registrations for insert
      with check (auth.uid() = user_id);
  end if;

  -- Admins (via service role or admin flag) can view all
  if not exists (
    select from pg_policies where tablename = 'masterclass_registrations' and policyname = 'Admins can view all registrations'
  ) then
    create policy "Admins can view all registrations"
      on public.masterclass_registrations for select
      using ( exists ( select 1 from public.users where id = auth.uid() and role = 'admin' ) );
  end if;
end
$$;

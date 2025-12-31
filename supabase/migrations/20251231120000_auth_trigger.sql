-- Migration: Add Auth Trigger and Cascading Foreign Keys

-- 1. Create or Replace the Function to Handle New Users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_user_id uuid;
begin
  -- Search for an existing user profile with the same phone number
  -- (Assuming phone is the primary stable identifier for migration)
  if new.phone is not null then
    select id into existing_user_id
    from public.users
    where phone = new.phone
    limit 1;
  end if;

  if existing_user_id is not null then
    -- CONFLICT DETECTED: A profile already exists for this phone number.
    -- We must 'claim' this profile for the new Auth User ID.
    -- Because we enabled ON UPDATE CASCADE on foreign keys, updating the ID here
    -- will automatically move all registrations, enrollments, etc., to the new ID.
    
    update public.users
    set 
        id = new.id, -- This triggers the cascade
        email = coalesce(new.email, public.users.email),
        updated_at = now()
    where id = existing_user_id;
    
  else
    -- NO CONFLICT: Create a new user profile
    insert into public.users (id, email, phone, fullname)
    values (
      new.id,
      new.email,
      new.phone,
      new.raw_user_meta_data->>'full_name'
    )
    on conflict (id) do nothing; -- Safety check
  end if;

  return new;
end;
$$;

-- 2. Create the Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. update Foreign Keys to ON UPDATE CASCADE
-- We use a DO block to dynamically handle constraint names if needed, 
-- but explicit ALTER is safer if we know the schema.

-- A. enrollments
do $$
begin
  -- Drop existing constraint if it exists (standard name or specific name)
  if exists (select 1 from pg_constraint where conname = 'enrollments_user_id_fkey') then
    alter table public.enrollments drop constraint enrollments_user_id_fkey;
  end if;
  
  -- Recreate with ON UPDATE CASCADE
  alter table public.enrollments
    add constraint enrollments_user_id_fkey
    foreign key (user_id)
    references public.users(id)
    on update cascade
    on delete cascade;
end $$;

-- B. masterclass_registrations
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'masterclass_registrations_user_id_fkey') then
      alter table public.masterclass_registrations drop constraint masterclass_registrations_user_id_fkey;
  end if;
  
  -- Recreate with ON UPDATE CASCADE
  alter table public.masterclass_registrations
    add constraint masterclass_registrations_user_id_fkey
    foreign key (user_id)
    references public.users(id)
    on update cascade
    on delete cascade;
end $$;

-- C. tickets (If exists)
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'tickets') then
      if exists (select 1 from pg_constraint where conname = 'tickets_user_id_fkey') then
        alter table public.tickets drop constraint tickets_user_id_fkey;
      end if;
      
      alter table public.tickets
        add constraint tickets_user_id_fkey
        foreign key (user_id)
        references public.users(id)
        on update cascade
        on delete cascade;
  end if;
end $$;

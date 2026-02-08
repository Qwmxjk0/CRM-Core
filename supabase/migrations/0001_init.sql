create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists crm;
create schema if not exists ops;

create type crm.org_role as enum ('owner', 'admin', 'member', 'viewer');
create type crm.contact_status as enum ('lead', 'customer', 'inactive');
create type crm.interaction_type as enum ('note', 'invoice', 'payment', 'call', 'visit');

create table if not exists crm.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists crm.org_members (
  org_id uuid not null references crm.organizations(id) on delete cascade,
  user_id uuid not null,
  role crm.org_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists crm.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references crm.organizations(id) on delete cascade,
  display_name text not null,
  phone text,
  email citext,
  tags text[],
  status crm.contact_status not null default 'lead',
  external_ref jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists crm.interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references crm.organizations(id) on delete cascade,
  contact_id uuid not null references crm.contacts(id) on delete cascade,
  type crm.interaction_type not null,
  payload jsonb,
  occurred_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists ops.rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null,
  window_seconds int not null,
  updated_at timestamptz not null
);

create index if not exists org_members_user_idx on crm.org_members(user_id);
create index if not exists contacts_org_idx on crm.contacts(org_id);
create index if not exists contacts_email_idx on crm.contacts(email);
create index if not exists interactions_org_idx on crm.interactions(org_id);
create index if not exists interactions_contact_idx on crm.interactions(contact_id);

create or replace function crm.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on crm.contacts;
create trigger set_updated_at
before update on crm.contacts
for each row execute function crm.set_updated_at();

alter table crm.organizations enable row level security;
alter table crm.org_members enable row level security;
alter table crm.contacts enable row level security;
alter table crm.interactions enable row level security;

create policy orgs_select_member on crm.organizations
for select using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
  )
);

create policy orgs_insert_authenticated on crm.organizations
for insert with check (
  auth.uid() is not null
);

create policy orgs_update_admin on crm.organizations
for update using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy org_members_select_member on crm.org_members
for select using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = org_members.org_id
      and m.user_id = auth.uid()
  )
);

create policy org_members_insert_first_owner on crm.org_members
for insert with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1 from crm.org_members m
    where m.org_id = org_members.org_id
  )
);

create policy contacts_select_member on crm.contacts
for select using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = contacts.org_id
      and m.user_id = auth.uid()
  )
);

create policy contacts_insert_admin on crm.contacts
for insert with check (
  exists (
    select 1 from crm.org_members m
    where m.org_id = contacts.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy contacts_update_admin on crm.contacts
for update using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = contacts.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy interactions_select_member on crm.interactions
for select using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = interactions.org_id
      and m.user_id = auth.uid()
  )
);

create policy interactions_insert_member on crm.interactions
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from crm.org_members m
    where m.org_id = interactions.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'member')
  )
);

create policy interactions_update_admin on crm.interactions
for update using (
  exists (
    select 1 from crm.org_members m
    where m.org_id = interactions.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

grant usage on schema crm to authenticated;
grant usage on type crm.org_role, crm.contact_status, crm.interaction_type to authenticated;
grant select, insert, update on all tables in schema crm to authenticated;

alter default privileges in schema crm
grant usage on types to authenticated;

alter default privileges in schema crm
grant select, insert, update on tables to authenticated;

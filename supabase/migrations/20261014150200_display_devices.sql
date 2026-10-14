-- Display-device credentials for hallway kiosks (DATA_DISCLOSURE.md §0 R5, §4 DISPLAY, §7.4 #18).
-- Additive: two new tables and service_role-only RPCs.
--
-- The problem: today a hallway screen is a browser signed in as a real teacher or admin, so anyone at
-- the screen holds that staff account. A display device is instead a credential whose ONLY capability
-- is "render DISPLAY for one school". It is not a Supabase session, so every TEACHER/ADMIN surface
-- (which resolves the caller through auth.getUser()) rejects it by construction.
--
-- Pairing (UX: one step from a signed-in staff browser, no keyboard login on the kiosk):
--   1. The kiosk opens /display. The server mints a random device secret, stores only its SHA-256, puts
--      the secret in an httpOnly cookie, and shows an 8-character pairing code with a 10-minute expiry
--      (display_pairing_start).
--   2. A staff member, on their OWN signed-in phone or laptop, enters the code and taps "Pair as a
--      display for <School>" (display_pairing_approve). That is the one step. Staff credentials are
--      never typed on the kiosk.
--   3. The kiosk polls. On approval the server mints a 256-bit device token, stores only its SHA-256,
--      sets it as a long-lived httpOnly cookie, and the request is consumed (display_pairing_claim).
--      The token exists only in the kiosk's cookie. The approving browser never sees it.
--   Alternative one-step path: a staff member already signed in on the kiosk taps "Turn this screen
--   into a display". display_device_create mints the device, and the server signs the staff session
--   out of that browser in the same response.
-- Revocation: display_device_revoke, by any admin of the school or by the staff member who paired it.
-- A revoked token resolves to nothing on its next request.
--
-- Who may pair (DATA_DISCLOSURE.md D17, §10.14): any staff member of the school, admin or teacher, on
-- these conditions, which this file enforces in SQL:
--   1. A device lasts only as long as its pairer's authority. display_device_live() is false once the
--      pairer is no longer staff of the device's school, or once paired_by_user_id became NULL through
--      ON DELETE SET NULL. Such a device resolves to nothing and display_cut refuses it, until an admin
--      of the school re-confirms it (display_device_reconfirm), which makes that admin its pairer.
--   2. Admins see every device of the school (with pairer_active, so lapsed ones are visible) and can
--      revoke any of them. The pairer sees and can revoke their own.
--   3. The approving staff member must still be staff of the school when the kiosk claims the pairing.
-- Conditions enforced in TypeScript, not here: the "convert this browser" path signs the staff session
-- out in the same response and creates no device if that fails; approval comes from a staff session,
-- never a display session; the approval screen names the school.
--
-- Secrets: the database stores SHA-256 digests only (bytea, 32 bytes). Raw tokens never reach SQL,
-- logs, or any payload other than the Set-Cookie header.

create table public.display_device (
  id uuid primary key default gen_random_uuid(),
  school_id bigint not null references public.school (id) on update cascade on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  paired_by_user_id bigint references public."user" (id) on update cascade on delete set null,
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id bigint references public."user" (id) on update cascade on delete set null,
  -- Set when an admin re-confirms a device whose pairer lost staff status (D17 condition 1).
  reconfirmed_at timestamptz
);

-- Serves display_devices_for_school (the admin list) and the school check in display_cut.
create index display_device_school_id_idx on public.display_device (school_id);

create table public.display_pairing_request (
  id uuid primary key default gen_random_uuid(),
  user_code text not null check (user_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  device_secret_hash bytea not null unique check (octet_length(device_secret_hash) = 32),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  approved_school_id bigint references public.school (id) on update cascade on delete cascade,
  approved_label text,
  approved_by_user_id bigint references public."user" (id) on update cascade on delete set null,
  approved_at timestamptz,
  claimed_at timestamptz,
  device_id uuid references public.display_device (id) on delete set null
);

-- One live request per code. Serves the lookup in display_pairing_approve.
create unique index display_pairing_request_open_code_idx
  on public.display_pairing_request (user_code) where claimed_at is null;

-- RLS on, no policies: reachable only through the service_role RPCs below.
alter table public.display_device enable row level security;
alter table public.display_pairing_request enable row level security;
revoke all on table public.display_device from anon, authenticated;
revoke all on table public.display_pairing_request from anon, authenticated;
grant all on table public.display_device to service_role;
grant all on table public.display_pairing_request to service_role;

-- 8 Crockford base-32 characters = 40 bits, from pgcrypto's CSPRNG. Combined with a 10-minute expiry,
-- one live request per code, and the shared attempt bucket on approval, this cannot be guessed.
create or replace function public.random_crockford(p_length integer)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  _alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  _bytes bytea := extensions.gen_random_bytes(p_length);
  _out text := '';
  _i integer;
begin
  if p_length is null or p_length < 1 or p_length > 64 then
    raise exception 'length out of range';
  end if;
  for _i in 0 .. p_length - 1 loop
    -- 256 is a multiple of 32, so (byte & 31) is uniform: exactly 5 bits per character.
    _out := _out || substr(_alphabet, (get_byte(_bytes, _i) & 31) + 1, 1);
  end loop;
  return _out;
end;
$$;

-- D17 condition 1: a device is usable only while it is unrevoked AND its pairer is still staff of the
-- device's school. Used by display_device_resolve and display_cut (20261014150300).
create or replace function public.display_device_live(p_device_id uuid, p_school_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.display_device d
    where d.id = p_device_id
      and d.school_id = p_school_id
      and d.revoked_at is null
      and d.paired_by_user_id is not null
      and public.is_staff_of_school(d.paired_by_user_id, d.school_id)
  );
$$;

-- Kiosk, step 1. Unauthenticated by nature; the server rate-limits by client key before calling.
create or replace function public.display_pairing_start(p_device_secret_hash bytea)
returns table (request_id uuid, user_code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _code text;
  _attempt integer := 0;
begin
  delete from public.display_pairing_request r
  where r.expires_at < now() - interval '1 day' or (r.claimed_at is null and r.expires_at < now());

  loop
    _attempt := _attempt + 1;
    _code := public.random_crockford(8);
    begin
      return query
      insert into public.display_pairing_request as r (user_code, device_secret_hash)
      values (_code, p_device_secret_hash)
      returning r.id, r.user_code, r.expires_at;
      return;
    exception when unique_violation then
      if _attempt >= 5 then raise; end if;
    end;
  end loop;
end;
$$;

-- Staff browser, step 2. Returns 'approved' or 'no_match' (uniform for wrong, expired, used, or not
-- your school). Approval is open to any staff of the school (admin or teacher): D17, §10.14.
create or replace function public.display_pairing_approve(
  p_actor_user_id bigint,
  p_user_code text,
  p_school_id bigint,
  p_label text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _id uuid;
begin
  if not public.is_staff_of_school(p_actor_user_id, p_school_id) then
    return 'no_match';
  end if;
  if p_label is null or char_length(btrim(p_label)) not between 1 and 60 then
    raise exception 'Label must be 1 to 60 characters' using errcode = '22023';
  end if;

  update public.display_pairing_request r
  set approved_school_id = p_school_id,
      approved_label = btrim(p_label),
      approved_by_user_id = p_actor_user_id,
      approved_at = now()
  where r.user_code = upper(regexp_replace(coalesce(p_user_code, ''), '[\s-]', '', 'g'))
    and r.claimed_at is null
    and r.approved_at is null
    and r.expires_at > now()
  returning r.id into _id;

  return case when _id is null then 'no_match' else 'approved' end;
end;
$$;

-- Kiosk, step 3 (polled). Returns one row once approved; zero rows while pending or after expiry.
create or replace function public.display_pairing_claim(p_device_secret_hash bytea, p_token_hash bytea)
returns table (device_id uuid, school_id bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _req public.display_pairing_request%rowtype;
  _device uuid;
begin
  select * into _req
  from public.display_pairing_request r
  where r.device_secret_hash = p_device_secret_hash
    and r.claimed_at is null
    and r.approved_at is not null
    and r.expires_at > now() - interval '5 minutes'
  for update;
  if not found then
    return;
  end if;
  -- D17 condition 1 at birth: the approver must still be staff of the school.
  if _req.approved_by_user_id is null
     or not public.is_staff_of_school(_req.approved_by_user_id, _req.approved_school_id) then
    return;
  end if;

  insert into public.display_device (school_id, label, token_hash, paired_by_user_id)
  values (_req.approved_school_id, _req.approved_label, p_token_hash, _req.approved_by_user_id)
  returning id into _device;

  update public.display_pairing_request r
  set claimed_at = now(), device_id = _device
  where r.id = _req.id;

  return query select _device, _req.approved_school_id;
end;
$$;

-- Alternative path: a staff member signed in on the kiosk converts it directly.
create or replace function public.display_device_create(
  p_actor_user_id bigint,
  p_school_id bigint,
  p_label text,
  p_token_hash bytea
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _device uuid;
begin
  if not public.is_staff_of_school(p_actor_user_id, p_school_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  insert into public.display_device (school_id, label, token_hash, paired_by_user_id)
  values (p_school_id, btrim(p_label), p_token_hash, p_actor_user_id)
  returning id into _device;
  return _device;
end;
$$;

-- Every dashboard request from a kiosk. Zero rows means "not a display" (unknown, revoked, or its
-- pairer is no longer staff of the school, D17 condition 1).
-- last_seen_at is written at most every 5 minutes, so polling does not turn into a write per request.
-- paired_by_name is the staff member's name for the "Paired by" label (§10.7, ALLOWED).
create or replace function public.display_device_resolve(p_token_hash bytea)
returns table (device_id uuid, school_id bigint, school_name text, label text, paired_by_name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.display_device d
  set last_seen_at = now()
  where d.token_hash = p_token_hash
    and public.display_device_live(d.id, d.school_id)
    and (d.last_seen_at is null or d.last_seen_at < now() - interval '5 minutes');

  return query
  select d.id, d.school_id, sc.name::text, d.label,
    nullif(btrim(coalesce(t.first_name, u.first_name, '') || ' ' || coalesce(t.last_name, u.last_name, '')), '')
  from public.display_device d
  join public.school sc on sc.id = d.school_id
  left join public."user" u on u.id = d.paired_by_user_id
  left join lateral (
    select t.first_name, t.last_name from public.teacher t
    where t.linked_user = d.paired_by_user_id and t.school_id = d.school_id
    limit 1
  ) t on true
  where d.token_hash = p_token_hash
    and public.display_device_live(d.id, d.school_id);
end;
$$;

-- D17 condition 1: an admin of the school re-confirms a device (typically one whose pairer left), and
-- becomes its pairer. Returns false for a revoked device, another school's device, or a non-admin.
create or replace function public.display_device_reconfirm(p_actor_user_id bigint, p_device_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _hit uuid;
begin
  update public.display_device d
  set paired_by_user_id = p_actor_user_id,
      reconfirmed_at = now()
  where d.id = p_device_id
    and d.revoked_at is null
    and public.is_admin_of_school(p_actor_user_id, d.school_id)
  returning d.id into _hit;
  return _hit is not null;
end;
$$;

create or replace function public.display_device_revoke(p_actor_user_id bigint, p_device_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _hit uuid;
begin
  update public.display_device d
  set revoked_at = now(), revoked_by_user_id = p_actor_user_id
  where d.id = p_device_id
    and d.revoked_at is null
    and (public.is_admin_of_school(p_actor_user_id, d.school_id) or d.paired_by_user_id = p_actor_user_id)
  returning d.id into _hit;
  return _hit is not null;
end;
$$;

-- Admin list (staff see the devices they paired). No token material is returned. pairer_active is
-- false for a device that has lapsed under D17 condition 1, so the admin can re-confirm or revoke it.
create or replace function public.display_devices_for_school(p_actor_user_id bigint, p_school_id bigint)
returns table (device_id uuid, label text, paired_at timestamptz, paired_by_name text,
               last_seen_at timestamptz, revoked_at timestamptz, pairer_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.label, d.paired_at,
    nullif(btrim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''),
    d.last_seen_at, d.revoked_at,
    (d.paired_by_user_id is not null and public.is_staff_of_school(d.paired_by_user_id, d.school_id))
  from public.display_device d
  left join public."user" u on u.id = d.paired_by_user_id
  where d.school_id = p_school_id
    and (public.is_admin_of_school(p_actor_user_id, p_school_id) or d.paired_by_user_id = p_actor_user_id)
  order by d.revoked_at nulls first, d.paired_at desc;
$$;

revoke all on function public.random_crockford(integer) from public, anon, authenticated;
revoke all on function public.display_device_live(uuid, bigint) from public, anon, authenticated;
revoke all on function public.display_device_reconfirm(bigint, uuid) from public, anon, authenticated;
revoke all on function public.display_pairing_start(bytea) from public, anon, authenticated;
revoke all on function public.display_pairing_approve(bigint, text, bigint, text) from public, anon, authenticated;
revoke all on function public.display_pairing_claim(bytea, bytea) from public, anon, authenticated;
revoke all on function public.display_device_create(bigint, bigint, text, bytea) from public, anon, authenticated;
revoke all on function public.display_device_resolve(bytea) from public, anon, authenticated;
revoke all on function public.display_device_revoke(bigint, uuid) from public, anon, authenticated;
revoke all on function public.display_devices_for_school(bigint, bigint) from public, anon, authenticated;
grant execute on function public.random_crockford(integer) to service_role;
grant execute on function public.display_device_live(uuid, bigint) to service_role;
grant execute on function public.display_device_reconfirm(bigint, uuid) to service_role;
grant execute on function public.display_pairing_start(bytea) to service_role;
grant execute on function public.display_pairing_approve(bigint, text, bigint, text) to service_role;
grant execute on function public.display_pairing_claim(bytea, bytea) to service_role;
grant execute on function public.display_device_create(bigint, bigint, text, bytea) to service_role;
grant execute on function public.display_device_resolve(bytea) to service_role;
grant execute on function public.display_device_revoke(bigint, uuid) to service_role;
grant execute on function public.display_devices_for_school(bigint, bigint) to service_role;

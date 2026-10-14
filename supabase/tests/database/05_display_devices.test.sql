-- Display pairing, device authorization and lapse (docs/DATA_DISCLOSURE.md section 10.14, D17).
-- Staff: admin uid 1 (school 1), teachers uid 3 and 4 (school 1), admin uid 2 (school 2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;
create function pg_temp.h(t text) returns bytea language sql as $$ select extensions.digest(t, 'sha256') $$;

-- Pairing: kiosk start, staff approve, kiosk claim.
create temp table started as select * from public.display_pairing_start(pg_temp.h('kiosk-secret-1'));
select is((select length(user_code) from started), 8, 'pairing code has 8 characters');
select is((select count(*) from public.display_pairing_claim(pg_temp.h('kiosk-secret-1'), pg_temp.h('token-1'))), 0::bigint, 'claim before approval returns nothing');
select is(public.display_pairing_approve(pg_temp.uid(5), (select user_code from started), 1, 'Hall'), 'no_match', 'a student cannot approve');
select is(public.display_pairing_approve(pg_temp.uid(9), (select user_code from started), 1, 'Hall'), 'no_match', 'a parent cannot approve');
select is(public.display_pairing_approve(pg_temp.uid(2), (select user_code from started), 1, 'Hall'), 'no_match', 'staff of another school cannot approve');
select is(public.display_pairing_approve(pg_temp.uid(3), 'ZZZZZZZZ', 1, 'Hall'), 'no_match', 'a wrong code does not approve');
select throws_ok(
  format($$ select public.display_pairing_approve(%s, %L, 1, '') $$, pg_temp.uid(3), (select user_code from started)),
  '22023', 'Label must be 1 to 60 characters', 'an empty label is refused'
);
select is(public.display_pairing_approve(pg_temp.uid(3), lower((select user_code from started)), 1, 'Hall'), 'approved', 'a teacher of the school approves (case insensitive)');
select is(public.display_pairing_approve(pg_temp.uid(3), (select user_code from started), 1, 'Hall'), 'no_match', 'an approved code cannot be approved twice');
select is((select count(*) from public.display_pairing_claim(pg_temp.h('wrong-secret'), pg_temp.h('token-x'))), 0::bigint, 'claim with the wrong secret returns nothing');
create temp table claimed as select * from public.display_pairing_claim(pg_temp.h('kiosk-secret-1'), pg_temp.h('token-1'));
select is((select school_id from claimed), 1::bigint, 'claim returns the approved school');
select is((select count(*) from public.display_pairing_claim(pg_temp.h('kiosk-secret-1'), pg_temp.h('token-2'))), 0::bigint, 'a pairing request is single use');

-- Resolve and authorize through the device.
select results_eq(
  $$ select school_name, label from public.display_device_resolve(extensions.digest('token-1', 'sha256')) $$,
  $$ values ('Example Academy', 'Hall') $$, 'the token resolves to its school and label');
select is((select count(*) from public.display_device_resolve(pg_temp.h('not-a-token'))), 0::bigint, 'an unknown token resolves to nothing');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, (select device_id from claimed))), 9::bigint, 'the device sees the school 1 cut');
select is((select count(*) from public.display_cut(2, 3, 'overall', null, null, (select device_id from claimed))), 0::bigint, 'the device sees nothing of school 2');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, gen_random_uuid())), 0::bigint, 'a made-up device id sees nothing');
select throws_ok(
  format($$ select public.display_device_create(%s, 1, 'Sneaky', %L) $$, pg_temp.uid(5), pg_temp.h('token-3')),
  '42501', 'Not authorized', 'a student cannot create a device directly'
);

-- Lapse: the pairer (teacher 1, uid 3) stops being staff of the school.
update public.teacher set linked_user = null where id = 1;
select is(public.display_device_live((select device_id from claimed), 1), false, 'device is not live once its pairer is no longer staff');
select is((select count(*) from public.display_device_resolve(pg_temp.h('token-1'))), 0::bigint, 'a lapsed device no longer resolves');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, (select device_id from claimed))), 0::bigint, 'a lapsed device gets no rows from the cut');
select is(
  (select pairer_active from public.display_devices_for_school(pg_temp.uid(1), 1) where device_id = (select device_id from claimed)),
  false, 'the admin device list shows the pairer as inactive');
select is(public.display_device_reconfirm(pg_temp.uid(4), (select device_id from claimed)), false, 'a non-admin teacher cannot reconfirm');
select is(public.display_device_reconfirm(pg_temp.uid(2), (select device_id from claimed)), false, 'an admin of another school cannot reconfirm');
select is(public.display_device_reconfirm(pg_temp.uid(1), (select device_id from claimed)), true, 'an admin of the school reconfirms');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, (select device_id from claimed))), 9::bigint, 'after reconfirmation the device works again');

-- Revoke: another teacher cannot, an admin can.
select is(public.display_device_revoke(pg_temp.uid(4), (select device_id from claimed)), false, 'a teacher who did not pair it cannot revoke');
select is(public.display_device_revoke(pg_temp.uid(1), (select device_id from claimed)), true, 'an admin revokes');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, (select device_id from claimed))), 0::bigint, 'a revoked device gets no rows');
select is(public.display_device_reconfirm(pg_temp.uid(1), (select device_id from claimed)), false, 'a revoked device cannot be reconfirmed');

select * from finish();
rollback;

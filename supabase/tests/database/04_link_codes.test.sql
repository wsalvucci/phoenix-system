-- redeem_link_code / preview_link_code: uniform failure and the rate limit
-- (docs/DATA_DISCLOSURE.md D11, D21; migration 20261014230500).
-- Seed: student 39 has code STUD39ABCD, student 40 has PARENT7K3M, teacher 3 has TCH3CDE777.
-- Account uid 10 is a new, unlinked user.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;
create function pg_temp.key(c char) returns text language sql as $$ select repeat(c::text, 32) $$;

-- Uniform failure: every kind of miss returns the same word.
select is(public.redeem_link_code(pg_temp.uid(10), 1, 'WRONGCODE9', 'student_claim', pg_temp.key('a')), 'no_match', 'wrong code');
select is(public.redeem_link_code(pg_temp.uid(10), 2, 'STUD39ABCD', 'student_claim', pg_temp.key('a')), 'no_match', 'right code, wrong school');
select is(public.redeem_link_code(pg_temp.uid(10), 1, '', 'student_claim', pg_temp.key('a')), 'no_match', 'empty code');
select is(public.redeem_link_code(pg_temp.uid(10), 1, null, 'student_claim', pg_temp.key('a')), 'no_match', 'null code');
select is(public.redeem_link_code(pg_temp.uid(10), null, 'STUD39ABCD', 'student_claim', pg_temp.key('a')), 'no_match', 'null school');
select is(public.redeem_link_code(999999, 1, 'STUD39ABCD', 'student_claim', pg_temp.key('b')), 'no_match', 'unknown actor');
select is(public.redeem_link_code(pg_temp.uid(7), 1, 'PARENT7K3M', 'teacher_claim', pg_temp.key('f')), 'no_match', 'a student code used as a teacher code');
select is(
  (select linked_user from public.teacher where id = 3) is null and (select "linkedUser" from public.student where id = 39) is null,
  true, 'no failure linked anything'
);
select throws_ok(
  format($$ select public.redeem_link_code(%s, 1, 'x', 'bogus', %L) $$, pg_temp.uid(10), pg_temp.key('a')),
  '22023', 'Unknown purpose', 'unknown purpose raises'
);

-- Failures are logged without the code.
select is(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'link_attempt' and column_name ~* 'code'),
  0::bigint, 'link_attempt has no column that could hold a code'
);
select is((select count(*) from public.link_attempt where user_id = pg_temp.uid(10)), 5::bigint, 'five failures recorded for the user (null actor and unknown actor excluded)');

-- The sixth attempt is rate limited, even with the right code; the code is not consumed.
select is(public.redeem_link_code(pg_temp.uid(10), 1, 'STUD39ABCD', 'student_claim', pg_temp.key('a')), 'rate_limited', 'sixth attempt in an hour is rate_limited even with the correct code');
select is((select "linkedUser" from public.student where id = 39), null, 'the correct code was not consumed while rate limited');
select is((select count(*) from public.preview_link_code(pg_temp.uid(10), 1, 'STUD39ABCD', 'student_claim', pg_temp.key('a')) where status = 'rate_limited' and first_name is null and last_initial is null),
  1::bigint, 'preview shares the bucket and reveals no name when limited');

-- Aging out: attempts older than an hour stop counting.
update public.link_attempt set attempted_at = now() - interval '2 hours' where user_id = pg_temp.uid(10);
select is(public.redeem_link_code(pg_temp.uid(10), 1, 'stud-39 abcd', 'student_claim', pg_temp.key('a')), 'linked',
  'after the window passes the correct code links, and the code is case, space and hyphen insensitive');
select is((select count(*) from public.student where id = 39 and "linkedUser" = pg_temp.uid(10)), 1::bigint, 'student 39 is now linked to the redeeming user');
select is(public.redeem_link_code(pg_temp.uid(9), 1, 'STUD39ABCD', 'student_claim', pg_temp.key('c')), 'no_match', 'an already linked student looks like a miss');

-- Entries older than 24 hours are purged on the next call.
update public.link_attempt set attempted_at = now() - interval '30 hours' where user_id = pg_temp.uid(10);
select public.redeem_link_code(pg_temp.uid(9), 1, 'NOPE000000', 'student_claim', pg_temp.key('c'));
select is((select count(*) from public.link_attempt where user_id = pg_temp.uid(10)), 0::bigint, 'attempts older than 24 hours are purged');

-- Per-client bucket: 20 failures from one key block a user with a clean record.
do $$
declare n integer; u bigint;
begin
  for n in 1 .. 20 loop
    u := (select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(((n % 4) + 3)::text, 12, '0'))::uuid);
    insert into public.link_attempt (user_id, client_key, purpose) values (u, repeat('z', 32), 'student_claim');
  end loop;
end $$;
select is(public.redeem_link_code(pg_temp.uid(8), 1, 'PARENT7K3M', 'parent_link', repeat('z', 32)), 'rate_limited', '20 failures from one client key block a fresh user on that key');
select is(public.redeem_link_code(pg_temp.uid(8), 1, 'PARENT7K3M', 'parent_link', pg_temp.key('y')), 'linked', 'the same user on another key is not blocked');
select is((select count(*) from public.user_student_pair where user_id = pg_temp.uid(8) and student_id = 40), 1::bigint, 'parent link recorded');

-- Teacher claim and name preview.
select is(public.redeem_link_code(pg_temp.uid(10), 1, 'TCH3CDE777', 'teacher_claim', pg_temp.key('d')), 'linked', 'teacher claim with the right code');
select results_eq(
  format($$ select status, first_name, last_initial from public.preview_link_code(%s, 1, 'PARENT7K3M', 'parent_link', %L) $$, pg_temp.uid(7), pg_temp.key('e')),
  $$ values ('match', 'Nico', 'E') $$,
  'preview returns first name and last initial only'
);
select results_eq(
  format($$ select status, first_name, last_initial from public.preview_link_code(%s, 1, 'NOPE000000', 'parent_link', %L) $$, pg_temp.uid(7), pg_temp.key('e')),
  $$ values ('no_match', null, null) $$,
  'preview of a wrong code returns no names'
);

select * from finish();
rollback;

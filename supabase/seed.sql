-- Local test data. Runs on `supabase db reset` against the LOCAL stack only.
--
-- Everything here is fictional: people are "Ada Example", "Ben Sample" and so on, e-mails end in
-- @example.test, and every account uses the password in docs/TESTING.md. Never load this into a
-- real project: it creates accounts with a known password.
--
-- Dates are relative to now() so the "current" timeframe is always current. Scoring events sit three
-- days back, which is before today's UTC day start, so the leader-letter snapshot sees them.
--
-- Shape (details and the account table are in docs/TESTING.md):
--   School 1 "Example Academy": 40 students, grades 6-9, two teachers, one admin, one parent.
--   School 2 "Sample Prep": 5 students and one admin, for cross-school isolation checks.
--   Student totals in the current timeframe (school 1):
--     ids 1..11  100,95,90,85,80,80,70,65,60,55,55   (ties at 80 and at 55)
--     ids 12..36 50,48,...,2 (distinct)
--     id 37 has a 0 row, id 38 nets to 0 (+5 -5), ids 39 and 40 have no rows
--   Students 3, 14, 25, 36 are grade 9 (a cohort of 4). Everyone else is grade 6, 7 or 8.

-- ---------------------------------------------------------------------------------------------
-- Auth accounts. The handle_new_user trigger creates the matching public."user" rows.
-- ---------------------------------------------------------------------------------------------
create or replace function pg_temp.seed_auth_user(p_n integer, p_email text)
returns void
language plpgsql
as $$
declare
  _id uuid := ('00000000-0000-4000-8000-' || lpad(p_n::text, 12, '0'))::uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', _id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Passw0rd!test', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), _id::text, _id,
    jsonb_build_object('sub', _id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$$;

select pg_temp.seed_auth_user(1, 'admin@example.test');
select pg_temp.seed_auth_user(2, 'admin2@example.test');
select pg_temp.seed_auth_user(3, 'teacher1@example.test');
select pg_temp.seed_auth_user(4, 'teacher2@example.test');
select pg_temp.seed_auth_user(5, 'student@example.test');
select pg_temp.seed_auth_user(6, 'leader@example.test');
select pg_temp.seed_auth_user(7, 'ta@example.test');
select pg_temp.seed_auth_user(8, 'zero@example.test');
select pg_temp.seed_auth_user(9, 'parent@example.test');
select pg_temp.seed_auth_user(10, 'newuser@example.test');

-- ---------------------------------------------------------------------------------------------
-- Schools, admins, timeframes
-- ---------------------------------------------------------------------------------------------
insert into public.school (id, name) values (1, 'Example Academy'), (2, 'Sample Prep');

insert into public.admin (id) values (1), (2);
insert into public.admin_school_pair (admin_id, school_id) values (1, 1), (2, 2);

insert into public.school_timeframes (id, school_id, name, starts_at, ends_at, active) values
  (1, 1, 'Current term', now() - interval '60 days', now() + interval '60 days', true),
  (2, 1, 'Past term', now() - interval '200 days', now() - interval '100 days', false),
  (3, 2, 'Sample term', now() - interval '60 days', now() + interval '60 days', true);

-- Map seeded auth accounts to Phoenix user rows.
update public."user" u set first_name = v.first_name, last_name = v.last_name, admin_id = v.admin_id
from (values
  (1, 'Avery', 'Admin', 1), (2, 'Blake', 'Admin', 2)
) as v(n, first_name, last_name, admin_id)
where u.supabase_id = ('00000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid;

update public."user" u set first_name = v.first_name, last_name = v.last_name
from (values
  (3, 'Tara', 'Teacher'), (4, 'Theo', 'Teacher'), (5, 'Sam', 'Student'), (6, 'Lee', 'Leader'),
  (7, 'Tia', 'Assistant'), (8, 'Zed', 'Zero'), (9, 'Pat', 'Parent'), (10, 'Nia', 'Newcomer')
) as v(n, first_name, last_name)
where u.supabase_id = ('00000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid;

-- ---------------------------------------------------------------------------------------------
-- Students. School 1: ids 1..40. School 2: ids 41..45.
-- ---------------------------------------------------------------------------------------------
insert into public.student (id, school_id, powerschool_id, first_name, last_name, grade, birthdate)
select
  i,
  1,
  900000 + i,
  (array['Ada','Ben','Cora','Dev','Eli','Fay','Gus','Hana','Ivy','Jude','Kai','Lena','Milo','Nia','Omar',
         'Pia','Quinn','Rafi','Sana','Theo','Uma','Vik','Wren','Xia','Yara','Zane','Abe','Bea','Cal','Dara',
         'Eve','Finn','Gia','Hugo','Isla','Jax','Kira','Leo','Mona','Nico'])[i],
  (array['Example','Sample','Testcase','Placeholder'])[1 + (i % 4)],
  case when i in (3, 14, 25, 36) then 9 else 6 + (i % 3) end,
  date '2012-09-01' + (i * 17)
from generate_series(1, 40) as i;

-- Known link codes for the redeem and claim flows (Crockford: no I, L, O).
update public.student set link_code = 'STUD39ABCD' where id = 39;
update public.student set link_code = 'PARENT7K3M' where id = 40;

insert into public.student (id, school_id, powerschool_id, first_name, last_name, grade)
select 40 + i, 2, 950000 + i, (array['Una','Vera','Walt','Xena','Yuri'])[i], 'Sample', 7
from generate_series(1, 5) as i;

-- Account links. Web model: student."linkedUser"; mobile model: "user".student_id. Both are set.
update public.student s set "linkedUser" = u.id
from public."user" u
where (s.id, u.supabase_id) in (
  (7,  '00000000-0000-4000-8000-000000000005'::uuid),
  (20, '00000000-0000-4000-8000-000000000006'::uuid),
  (8,  '00000000-0000-4000-8000-000000000007'::uuid),
  (38, '00000000-0000-4000-8000-000000000008'::uuid)
);
update public."user" u set student_id = s.id from public.student s where s."linkedUser" = u.id;

-- ---------------------------------------------------------------------------------------------
-- Teachers (3 is unlinked, with a known code for the teacher claim flow)
-- ---------------------------------------------------------------------------------------------
insert into public.teacher (id, school_id, first_name, last_name, linked_user)
select v.id, 1, v.first_name, v.last_name, u.id
from (values
  (1, 'Tara', 'Teacher', '00000000-0000-4000-8000-000000000003'::uuid),
  (2, 'Theo', 'Teacher', '00000000-0000-4000-8000-000000000004'::uuid)
) as v(id, first_name, last_name, supabase_id)
join public."user" u on u.supabase_id = v.supabase_id;
insert into public.teacher (id, school_id, first_name, last_name, link_code)
values (3, 1, 'Una', 'Unlinked', 'TCH3CDE777');

-- Parent linked to student 7's account holder's record (child = student 7).
insert into public.user_student_pair (user_id, student_id)
select u.id, 7 from public."user" u where u.supabase_id = '00000000-0000-4000-8000-000000000009'::uuid;

-- ---------------------------------------------------------------------------------------------
-- Groups. Homeroom A (teacher 1): students 1..20, leader 20, assistant student 8.
-- Homeroom B (teacher 2): students 21..40. Math Club (teacher 1): students 1..6.
-- ---------------------------------------------------------------------------------------------
insert into public.student_group (id, name, school_id, timeframe_id, archived) values
  (1, 'Homeroom A', 1, 1, false),
  (2, 'Homeroom B', 1, 1, false),
  (3, 'Math Club', 1, 1, false),
  (4, 'Retired Group', 1, 1, true),
  (5, 'Sample Homeroom', 2, 3, false);

insert into public.student_group_pair (student_id, student_group_id)
select i, case when i <= 20 then 1 else 2 end from generate_series(1, 40) i;
insert into public.student_group_pair (student_id, student_group_id) select i, 3 from generate_series(1, 6) i;
insert into public.student_group_pair (student_id, student_group_id) select 40 + i, 5 from generate_series(1, 5) i;

insert into public.teacher_student_group_pair (teacher_id, group_id) values (1, 1), (1, 3), (2, 2);
insert into public.student_group_leaders (student_id, group_id) values (20, 1);
insert into public.teaching_assistant (id, student_id, group_id, full_access) values (1, 8, 1, true);

insert into public.ranking_group (id, name, school_id, timeframe_id) values (1, 'Houses', 1, 1);
insert into public.ranking_group_pair (ranking_group_id, student_group_id) values (1, 1), (1, 2);
insert into public.teacher_ranking_group_pair (teacher_id, ranking_group_id) values (1, 1), (2, 1);

-- ---------------------------------------------------------------------------------------------
-- Point groups (3 is unranked), templates and events
-- ---------------------------------------------------------------------------------------------
insert into public.point_group (id, name, school_id, ranked, color) values
  (1, 'Kindness', 1, true, '#2E7D32'),
  (2, 'Effort', 1, true, '#1565C0'),
  (3, 'Attendance', 1, false, '#6D4C41'),
  (4, 'Sample Points', 2, true, '#8E24AA');

insert into public.point_template_type (id, name) values (1, 'Standard');

-- One template and one event per (point group, homeroom). Events 1..6, then 7 in the past term.
insert into public.point_template (id, name, template_type_id, point_group_id, student_group_id, conversion_rule_value, max_input_value)
select t.id, t.name, 1, t.pg, t.sg, 1, 100
from (values
  (1, 'Kindness A', 1, 1), (2, 'Kindness B', 1, 2),
  (3, 'Effort A',   2, 1), (4, 'Effort B',   2, 2),
  (5, 'Attendance A', 3, 1), (6, 'Attendance B', 3, 2)
) as t(id, name, pg, sg);

insert into public.point_event (id, template_id, student_group_id, date, name, max_input, point_group_id)
select t.id, t.id, t.sg, now() - interval '3 days', t.name || ' week 1', 100, t.pg
from (values
  (1, 'Kindness A', 1, 1), (2, 'Kindness B', 1, 2),
  (3, 'Effort A',   2, 1), (4, 'Effort B',   2, 2),
  (5, 'Attendance A', 3, 1), (6, 'Attendance B', 3, 2)
) as t(id, name, pg, sg);

insert into public.point_event (id, template_id, student_group_id, date, name, max_input, point_group_id)
values (7, 1, 1, now() - interval '150 days', 'Kindness A past term', 100, 1);

-- Per-student totals. K = kindness, E = effort (odd ids only), A = attendance (T/5).
-- Odd ids: K = T/2, E = T - K - A.  Even ids: K = T - A, no effort row.
with totals as (
  select i,
    case
      when i = 1 then 100 when i = 2 then 95 when i = 3 then 90 when i = 4 then 85
      when i in (5, 6) then 80 when i = 7 then 70 when i = 8 then 65 when i = 9 then 60
      when i in (10, 11) then 55
      when i between 12 and 36 then 50 - 2 * (i - 12)
      else 0
    end as t
  from generate_series(1, 36) i
),
split as (
  select i, t, t / 5 as a,
    case when i % 2 = 1 then t / 2 else t - t / 5 end as k,
    case when i % 2 = 1 then t - t / 2 - t / 5 end as e
  from totals
)
insert into public.student_point (student_id, point_event_id, point_value, input_score)
select i, case when i <= 20 then 1 else 2 end, k, k from split
union all
select i, case when i <= 20 then 3 else 4 end, e, e from split where e is not null
union all
select i, case when i <= 20 then 5 else 6 end, a, a from split where a > 0;

-- Zero-ish students: 37 has an explicit 0 row, 38 nets to 0, 39 and 40 have nothing.
insert into public.student_point (student_id, point_event_id, point_value, input_score) values
  (37, 2, 0, 0),
  (38, 2, 5, 5),
  (38, 4, -5, -5);

-- A past-term score that must never count toward the current term.
insert into public.student_point (student_id, point_event_id, point_value, input_score) values (1, 7, 500, 500);

-- School 2 scores.
insert into public.point_template (id, name, template_type_id, point_group_id, student_group_id, conversion_rule_value, max_input_value)
values (7, 'Sample template', 1, 4, 5, 1, 100);
insert into public.point_event (id, template_id, student_group_id, date, name, max_input, point_group_id)
values (8, 7, 5, now() - interval '3 days', 'Sample event', 100, 4);
insert into public.student_point (student_id, point_event_id, point_value, input_score)
select 40 + i, 8, i * 10, i * 10 from generate_series(1, 5) i;

-- ---------------------------------------------------------------------------------------------
-- Shares: student 7 shares two kindness points into Homeroom A (one pinned).
-- ---------------------------------------------------------------------------------------------
insert into public.shared_point (student_point_id, shared_group_id, pinned)
select sp.id, 1, sp.point_event_id = 1
from public.student_point sp
where sp.student_id = 7 and sp.point_event_id in (1, 3);

-- ---------------------------------------------------------------------------------------------
-- Keep identity sequences ahead of the explicit ids above.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.is_identity = 'YES'
  loop
    execute format(
      'select setval(pg_get_serial_sequence(%L, %L), greatest((select coalesce(max(%I), 0) from public.%I), 1))',
      'public.' || quote_ident(r.table_name), r.column_name, r.column_name, r.table_name
    );
  end loop;
end;
$$;

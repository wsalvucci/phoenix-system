-- !!! FLAGGED: DO NOT APPLY WITHOUT A REISSUE PLAN AND THE PRODUCT OWNER'S EXPLICIT GO-AHEAD !!!
--
-- One-time regeneration of every student and teacher link code, plus UNIQUE (school_id, link_code).
-- (DATA_DISCLOSURE.md D12, §10.4 condition 5, §10.11.)
--
-- WHAT IS LOST: every existing student.link_code and teacher.link_code value is overwritten. Any code
-- staff have already printed, emailed, or handed to a family stops working the moment this applies.
-- That covers unclaimed student accounts, families who have not yet linked as parents, and unlinked
-- teachers. Links that already exist (student."linkedUser", user_student_pair, teacher.linked_user)
-- are NOT touched: everyone already linked stays linked.
-- The old values are not kept anywhere. They are 28-bit credentials, and keeping them would defeat
-- the purpose.
--
-- Why: the live codes are 7 hex characters of md5(random()), which is 28 bits. They are not unique,
-- and some were minted from md5(Date.now()) or Math.random() in TypeScript. §10.4 requires at least
-- 40 bits before the "Is this Maya R.?" preview may ship. These are 50.
--
-- Prerequisites:
--   * 20261014230200 (random_crockford) and 20261014230500 (generate_link_code) are applied.
--   * The TypeScript code generators in api/admin/teachers.ts and
--     app/supaApi/client/admin/teachers/adminTeachersApi.ts have been switched to the database default
--     or admin_rotate_link_code. Otherwise new 6-7 character codes keep appearing (BACKEND_PLAN.md 6.4).
--   * Staff have a reissue plan: admins print or send the new codes from the admin student and
--     teacher screens (the only payload allowed to carry a raw code, hard rule 4).
--
-- Collision handling: generate_link_code has 2^50 values, so a collision inside one school is
-- astronomically unlikely. If one happens, the unique index below fails to build and the whole migration
-- rolls back (it runs in one transaction), leaving the old codes in place. Re-running it is safe.

update public.student set link_code = public.generate_link_code();
update public.teacher set link_code = public.generate_link_code();

-- Linking matches on (school_id, upper(link_code)), so uniqueness is enforced on that expression.
-- These indexes also serve the lookups in redeem_link_code and preview_link_code.
create unique index student_school_link_code_key on public.student (school_id, upper(link_code));
create unique index teacher_school_link_code_key on public.teacher (school_id, upper(link_code));

-- From here on, a code shorter than 10 characters can only come from a bypassing TypeScript generator.
alter table public.student add constraint student_link_code_format
  check (link_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$');
alter table public.teacher add constraint teacher_link_code_format
  check (link_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$');

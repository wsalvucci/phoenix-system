-- Live public-schema functions, read-only snapshot 2026-10-14 (project hqhsbnxkygihxnqevthe)

-- add_student_group(provided_school_id bigint, provided_name text, provided_parent_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.add_student_group(provided_school_id bigint, provided_name text, provided_parent_id bigint DEFAULT NULL::bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);
  if provided_parent_id is null then
    insert into student_group (name, school_id)
    values (provided_name, provided_school_id);
  else
    perform check_admin_access_to_student_group(provided_parent_id);

    insert into student_group (name, parent_id, school_id)
    values (provided_name, provided_parent_id, provided_school_id);
  end if;
end;
$function$;

-- add_student_to_student_group(provided_student_id bigint, provided_student_group_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.add_student_to_student_group(provided_student_id bigint, provided_student_group_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_student_group(provided_student_group_id);
  perform check_admin_access_to_student(provided_student_id);

  insert into student_group_pair (student_id, student_group_id)
  values (provided_student_id, provided_student_group_id);
end;
$function$;

-- add_teacher_to_student_group(provided_teacher_id integer, provided_student_group_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.add_teacher_to_student_group(provided_teacher_id integer, provided_student_group_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_student_group(provided_student_group_id);
  perform check_admin_access_to_teacher(provided_teacher_id);

  insert into teacher_student_group_pair (teacher_id, group_id)
  values (provided_teacher_id, provided_student_group_id);
end;
$function$;

-- auth_current_student()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.auth_current_student()
 RETURNS TABLE(student_id bigint, school_id bigint, grade bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT s.id, s.school_id, s.grade
  FROM public."user" u
  JOIN public.student s ON s.id = u.student_id
  WHERE u.supabase_id = auth.uid();
$function$;

-- check_admin_access_to_school(provided_school_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.check_admin_access_to_school(provided_school_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate the user has access to the school
  IF NOT EXISTS (SELECT 1 FROM get_schools_as_admin() WHERE id = provided_school_id) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to school %', provided_school_id;
  END IF;
END;
$function$;

-- check_admin_access_to_student(provided_student_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.check_admin_access_to_student(provided_student_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (
    select 1
    from get_schools_as_admin() as schools
    left join student on schools.id = student.school_id
    where student.id = provided_student_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to student %', provided_student_id;
  END IF;
end;
$function$;

-- check_admin_access_to_student_group(provided_student_group_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.check_admin_access_to_student_group(provided_student_group_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (
    select 1
    from get_schools_as_admin() as schools
    left join student_group on schools.id = student_group.school_id
    where student_group.id = provided_student_group_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to student group %', provided_student_group_id;
  END IF;
end;
$function$;

-- check_admin_access_to_teacher(provided_teacher_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.check_admin_access_to_teacher(provided_teacher_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (
    select 1
    from get_schools_as_admin() as schools
    left join teacher on schools.id = teacher.school_id
    where teacher.id = provided_teacher_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to teacher %', provided_teacher_id;
  END IF;
end;
$function$;

-- create_group(school_id integer, name text, parent_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.create_group(school_id integer, name text, parent_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM check_admin_access_to_school(school_id);

  INSERT INTO student_group (name, parent_id, school_id) VALUES (name, parent_id, school_id);
END;
$function$;

-- create_school_and_pair_admin(admin_id integer, school_name text)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.create_school_and_pair_admin(admin_id integer, school_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
    new_school_id integer;
BEGIN
    -- Validate the admin_id: Ensure it exists in the admin table
    IF NOT EXISTS (SELECT 1 FROM admin WHERE id = admin_id) THEN
        RAISE EXCEPTION 'Unauthorized: admin_id % does not exist', admin_id;
    END IF;

    -- Validate the school_name: Ensure it is not null or empty
    IF school_name IS NULL OR school_name = '' THEN
        RAISE EXCEPTION 'Invalid school_name: must not be null or empty';
    END IF;

    -- Insert into school table and get the new school ID
    INSERT INTO school (name) VALUES (school_name) RETURNING id INTO new_school_id;

    -- Insert the pair into admin_school_pair
    INSERT INTO admin_school_pair (admin_id, school_id) VALUES (admin_id, new_school_id);
END;$function$;

-- duplicate_scorebook_events(provided_teacher_id bigint, provided_student_group_id bigint, provided_source_timeframe_id bigint, provided_shift_amount integer, provided_shift_unit text, provided_expected_source_event_ids bigint[], provided_destination_timeframe_id bigint, provided_excluded_event_ids bigint[], provided_request_id uuid)  lang=plpgsql security_definer=False config={"search_path=\"\""}
CREATE OR REPLACE FUNCTION public.duplicate_scorebook_events(provided_teacher_id bigint, provided_student_group_id bigint, provided_source_timeframe_id bigint, provided_shift_amount integer, provided_shift_unit text, provided_expected_source_event_ids bigint[], provided_destination_timeframe_id bigint DEFAULT NULL::bigint, provided_excluded_event_ids bigint[] DEFAULT '{}'::bigint[], provided_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  group_school_id bigint;
  source_start date;
  source_end date;
  destination_start date;
  destination_end date;
  normalized_excluded_ids bigint[] := '{}';
  normalized_expected_source_ids bigint[] := '{}';
  current_source_ids bigint[] := '{}';
  copied_source_ids bigint[] := '{}';
  created_ids bigint[] := '{}';
  adjusted_dates jsonb := '[]'::jsonb;
  existing_operation public.scorebook_event_copy_operation%rowtype;
  source_event record;
  new_event_id bigint;
  shifted_date date;
  target_year integer;
  target_month integer;
  target_day integer;
  total_months integer;
  outside_destination_count integer := 0;
begin
  if provided_shift_amount is null or provided_shift_amount < 1 or provided_shift_amount > 10000 then
    raise exception 'Shift amount must be between 1 and 10000';
  end if;

  if provided_shift_unit not in ('days', 'months', 'years') then
    raise exception 'Shift unit must be days, months, or years';
  end if;

  select coalesce(array_agg(distinct event_id order by event_id), '{}')
  into normalized_excluded_ids
  from unnest(coalesce(provided_excluded_event_ids, '{}')) as event_id;

  select coalesce(array_agg(distinct event_id order by event_id), '{}')
  into normalized_expected_source_ids
  from unnest(coalesce(provided_expected_source_event_ids, '{}')) as event_id;

  select * into existing_operation
  from public.scorebook_event_copy_operation
  where request_id = provided_request_id;

  if found then
    if existing_operation.teacher_id <> provided_teacher_id
      or existing_operation.student_group_id <> provided_student_group_id
      or existing_operation.source_timeframe_id <> provided_source_timeframe_id
      or existing_operation.shift_amount <> provided_shift_amount
      or existing_operation.shift_unit <> provided_shift_unit
      or existing_operation.destination_timeframe_id is distinct from provided_destination_timeframe_id
      or existing_operation.excluded_event_ids <> normalized_excluded_ids then
      raise exception 'Request ID has already been used with different parameters';
    end if;

    return jsonb_build_object(
      'copiedCount', cardinality(existing_operation.created_event_ids),
      'createdEventIds', to_jsonb(existing_operation.created_event_ids),
      'sourceEventIds', to_jsonb(existing_operation.source_event_ids),
      'excludedEventIds', to_jsonb(existing_operation.excluded_event_ids),
      'outsideDestinationCount', existing_operation.outside_destination_count,
      'adjustedDates', existing_operation.adjusted_dates,
      'replayed', true
    );
  end if;

  select school_id into group_school_id
  from public.student_group
  where id = provided_student_group_id;

  if group_school_id is null then
    raise exception 'Student group was not found or has no school';
  end if;

  if not exists (
    select 1
    from public.teacher_student_group_pair
    where teacher_id = provided_teacher_id
      and group_id = provided_student_group_id
  ) then
    raise exception 'Teacher does not have access to this student group';
  end if;

  select starts_at::date, ends_at::date into source_start, source_end
  from public.school_timeframes
  where id = provided_source_timeframe_id
    and school_id = group_school_id;

  if source_start is null or source_end is null then
    raise exception 'Source timeframe does not belong to the student group school';
  end if;

  if provided_destination_timeframe_id is not null then
    select starts_at::date, ends_at::date into destination_start, destination_end
    from public.school_timeframes
    where id = provided_destination_timeframe_id
      and school_id = group_school_id;

    if destination_start is null or destination_end is null then
      raise exception 'Destination timeframe does not belong to the student group school';
    end if;
  end if;

  select coalesce(array_agg(id order by id), '{}')
  into current_source_ids
  from public.point_event
  where student_group_id = provided_student_group_id
    and date between source_start and source_end;

  if current_source_ids <> normalized_expected_source_ids then
    raise exception 'The source timeframe changed after the duplication dialog was opened';
  end if;

  if exists (
    select 1
    from unnest(normalized_excluded_ids) as excluded_id
    where not exists (
      select 1
      from public.point_event
      where id = excluded_id
        and student_group_id = provided_student_group_id
        and date between source_start and source_end
    )
  ) then
    raise exception 'One or more excluded events are outside the source timeframe';
  end if;

  for source_event in
    select id, student_group_id, template_id, point_group_id, date, name, max_input, conversion_formula
    from public.point_event
    where student_group_id = provided_student_group_id
      and date between source_start and source_end
      and not (id = any(normalized_excluded_ids))
    order by date, id
  loop
    if provided_shift_unit = 'days' then
      shifted_date := source_event.date + provided_shift_amount;
    else
      total_months := extract(year from source_event.date)::integer * 12
        + extract(month from source_event.date)::integer - 1
        + provided_shift_amount * case when provided_shift_unit = 'years' then 12 else 1 end;
      target_year := floor(total_months / 12.0)::integer;
      target_month := mod(total_months, 12) + 1;
      target_day := least(
        extract(day from source_event.date)::integer,
        extract(day from (make_date(target_year, target_month, 1) + interval '1 month - 1 day'))::integer
      );
      shifted_date := make_date(target_year, target_month, target_day);

      if target_day <> extract(day from source_event.date)::integer then
        adjusted_dates := adjusted_dates || jsonb_build_array(jsonb_build_object(
          'sourceEventId', source_event.id,
          'sourceDate', source_event.date,
          'resultingDate', shifted_date
        ));
      end if;
    end if;

    insert into public.point_event (
      student_group_id,
      template_id,
      point_group_id,
      date,
      name,
      max_input,
      conversion_formula
    ) values (
      source_event.student_group_id,
      source_event.template_id,
      source_event.point_group_id,
      shifted_date,
      source_event.name,
      source_event.max_input,
      source_event.conversion_formula
    ) returning id into new_event_id;

    insert into public.student_point (
      student_id,
      point_event_id,
      point_value,
      input_score,
      notes
    )
    select student_id, new_event_id, 0, 0, null
    from public.student_group_pair
    where student_group_id = provided_student_group_id;

    copied_source_ids := array_append(copied_source_ids, source_event.id);
    created_ids := array_append(created_ids, new_event_id);

    if destination_start is not null
      and (shifted_date < destination_start or shifted_date > destination_end) then
      outside_destination_count := outside_destination_count + 1;
    end if;
  end loop;

  if cardinality(created_ids) = 0 then
    raise exception 'No events remain selected for duplication';
  end if;

  insert into public.scorebook_event_copy_operation (
    request_id,
    teacher_id,
    student_group_id,
    source_timeframe_id,
    destination_timeframe_id,
    shift_amount,
    shift_unit,
    source_event_ids,
    excluded_event_ids,
    created_event_ids,
    outside_destination_count,
    adjusted_dates
  ) values (
    provided_request_id,
    provided_teacher_id,
    provided_student_group_id,
    provided_source_timeframe_id,
    provided_destination_timeframe_id,
    provided_shift_amount,
    provided_shift_unit,
    copied_source_ids,
    normalized_excluded_ids,
    created_ids,
    outside_destination_count,
    adjusted_dates
  );

  return jsonb_build_object(
    'copiedCount', cardinality(created_ids),
    'createdEventIds', to_jsonb(created_ids),
    'sourceEventIds', to_jsonb(copied_source_ids),
    'excludedEventIds', to_jsonb(normalized_excluded_ids),
    'outsideDestinationCount', outside_destination_count,
    'adjustedDates', adjusted_dates,
    'replayed', false
  );
end;
$function$;

-- edit_scorebook_point_event(provided_point_event_id bigint, provided_student_group_id bigint, provided_date timestamp with time zone, provided_name text, provided_max_input bigint, provided_conversion_formula text, provided_point_group_id bigint, provided_student_points jsonb)  lang=plpgsql security_definer=True config={"search_path=\"\""}
CREATE OR REPLACE FUNCTION public.edit_scorebook_point_event(provided_point_event_id bigint, provided_student_group_id bigint, provided_date timestamp with time zone, provided_name text, provided_max_input bigint, provided_conversion_formula text, provided_point_group_id bigint, provided_student_points jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if jsonb_typeof(provided_student_points) is distinct from 'array' then raise exception 'Student points must be an array'; end if;
  update public.point_event set date=provided_date, name=provided_name, max_input=provided_max_input,
    conversion_formula=nullif(btrim(provided_conversion_formula), ''), point_group_id=provided_point_group_id
  where id=provided_point_event_id and student_group_id=provided_student_group_id;
  if not found then raise exception 'Point event not found in this student group'; end if;
  if exists (
    select 1 from jsonb_array_elements(provided_student_points) item
    left join public.student_group_pair pair on pair.student_group_id=provided_student_group_id
      and pair.student_id=(item->>'student_id')::bigint
    where pair.student_id is null
  ) then raise exception 'A student does not belong to this student group'; end if;
  insert into public.student_point (student_id, point_event_id, point_value, input_score, notes)
  select (item->>'student_id')::bigint, provided_point_event_id, (item->>'point_value')::bigint,
    (item->>'input_score')::bigint, item->>'notes'
  from jsonb_array_elements(provided_student_points) item
  on conflict (student_id, point_event_id) do update
  set point_value=excluded.point_value, input_score=excluded.input_score, notes=excluded.notes;
end;
$function$;

-- get_active_timeframe()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_active_timeframe()
 RETURNS TABLE(id bigint, name text, starts_at timestamp with time zone, ends_at timestamp with time zone, active boolean, school_id bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT st.id, st.name, st.starts_at, st.ends_at, st.active, st.school_id
  FROM public.school_timeframes st
  JOIN public.student s ON s.school_id = st.school_id
  JOIN public."user" u ON u.student_id = s.id
  WHERE u.supabase_id = auth.uid()
    AND st.active = true
  LIMIT 1;
$function$;

-- get_all_timeframes()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_all_timeframes()
 RETURNS TABLE(id bigint, name text, starts_at timestamp with time zone, ends_at timestamp with time zone, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT st.id, st.name, st.starts_at, st.ends_at, st.active
  FROM public.school_timeframes st
  JOIN public.student s ON s.school_id = st.school_id
  JOIN public."user" u ON u.student_id = s.id
  WHERE u.supabase_id = auth.uid()
  ORDER BY st.starts_at DESC;
$function$;

-- get_available_leaderboard_scopes(p_timeframe_id bigint)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_available_leaderboard_scopes(p_timeframe_id bigint)
 RETURNS TABLE(scope_type text, scope_id bigint, scope_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH current_student AS (
    SELECT student_id, school_id, grade FROM auth_current_student()
  )
  SELECT 'school'::text, cs.school_id, sc.name::text
  FROM current_student cs
  JOIN public.school sc ON sc.id = cs.school_id

  UNION ALL

  SELECT 'grade'::text, s.grade, ('Grade ' || s.grade)::text
  FROM public.student s
  JOIN current_student cs ON s.school_id = cs.school_id
  GROUP BY s.grade

  UNION ALL

  SELECT 'point_group'::text, pg.id, pg.name::text
  FROM public.point_group pg
  JOIN current_student cs ON pg.school_id = cs.school_id
  WHERE pg.ranked = true

  UNION ALL

  SELECT 'student_group'::text, sg.id, sg.name::text
  FROM current_student cs
  JOIN public.student_group_pair sgp ON sgp.student_id = cs.student_id
  JOIN public.student_group sg ON sg.id = sgp.student_group_id
    AND sg.archived = false
    AND (sg.timeframe_id IS NULL OR sg.timeframe_id = p_timeframe_id)

  UNION ALL

  SELECT DISTINCT 'ranking_group'::text, rg.id, rg.name
  FROM current_student cs
  JOIN public.student_group_pair sgp ON sgp.student_id = cs.student_id
  JOIN public.ranking_group_pair rgp ON rgp.student_group_id = sgp.student_group_id
  JOIN public.ranking_group rg ON rg.id = rgp.ranking_group_id
  WHERE rg.timeframe_id = p_timeframe_id;
$function$;

-- get_category_breakdown(p_timeframe_id bigint)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_category_breakdown(p_timeframe_id bigint)
 RETURNS TABLE(point_group_id bigint, point_group_name text, color text, total_points bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH current_student AS (
    SELECT u.student_id
    FROM public."user" u
    WHERE u.supabase_id = auth.uid()
  ),
  tf AS (
    SELECT starts_at, ends_at FROM public.school_timeframes WHERE id = p_timeframe_id
  )
  SELECT
    pg.id,
    pg.name::text,
    pg.color,
    SUM(sp.point_value)::bigint
  FROM current_student cs
  JOIN public.student_point sp ON sp.student_id = cs.student_id
  JOIN public.point_event pe ON pe.id = sp.point_event_id
    AND pe.date >= (SELECT starts_at FROM tf)
    AND pe.date <= (SELECT ends_at FROM tf)
    AND pe.point_group_id IS NOT NULL
  JOIN public.point_group pg ON pg.id = pe.point_group_id
  GROUP BY pg.id, pg.name, pg.color
  ORDER BY SUM(sp.point_value) DESC;
$function$;

-- get_dashboard_totals(p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_dashboard_totals(p_timeframe_id bigint)
 RETURNS TABLE(student_id bigint, total_points bigint, school_rank bigint, total_students bigint, first_name text, last_name text, school_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_student_id  bigint;
  v_school_id   bigint;
  v_tf_starts   timestamptz;
  v_tf_ends     timestamptz;
  v_first_name  text;
  v_last_name   text;
  v_school_name text;
BEGIN
  SELECT u.student_id, s.school_id, s.first_name, s.last_name, sc.name
  INTO v_student_id, v_school_id, v_first_name, v_last_name, v_school_name
  FROM public."user" u
  JOIN public.student s ON s.id = u.student_id
  JOIN public.school sc ON sc.id = s.school_id
  WHERE u.supabase_id = auth.uid();

  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT starts_at, ends_at
  INTO v_tf_starts, v_tf_ends
  FROM public.school_timeframes
  WHERE id = p_timeframe_id;

  RETURN QUERY
  SELECT
    v_student_id,
    my_pts.pts::bigint,
    ranked.rank_val,
    ranked.total_count,
    v_first_name,
    v_last_name,
    v_school_name
  FROM (
    SELECT
      s.id,
      RANK() OVER (ORDER BY COALESCE(SUM(sp.point_value), 0) DESC)::bigint AS rank_val,
      COUNT(*) OVER ()::bigint AS total_count
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_tf_starts AND pe.date <= v_tf_ends
    WHERE s.school_id = v_school_id
    GROUP BY s.id
  ) ranked
  CROSS JOIN (
    SELECT COALESCE(SUM(sp.point_value), 0) AS pts
    FROM public.student_point sp
    JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_tf_starts AND pe.date <= v_tf_ends
    WHERE sp.student_id = v_student_id
  ) my_pts
  WHERE ranked.id = v_student_id;
END;
$function$;

-- get_grade_leaderboard(p_grade bigint, p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_grade_leaderboard(p_grade bigint, p_timeframe_id bigint)
 RETURNS TABLE(rank bigint, student_id bigint, first_name text, last_name text, total_points bigint, is_current_student boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_top        integer;
BEGIN
  SELECT cs.student_id, cs.school_id
  INTO v_student_id, v_school_id
  FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  SELECT vc.leaderboard_top_per_grade INTO v_top FROM visibility_config() vc;

  RETURN QUERY
  WITH totals AS (
    SELECT
      s.id AS sid,
      s.first_name AS fname,
      s.last_name AS lname,
      COALESCE(SUM(sp.point_value), 0)::bigint AS total_pts,
      RANK() OVER (ORDER BY COALESCE(SUM(sp.point_value), 0) DESC)::bigint AS rnk
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    WHERE s.school_id = v_school_id AND s.grade = p_grade
    GROUP BY s.id, s.first_name, s.last_name
  )
  SELECT t.rnk, t.sid, t.fname, t.lname, t.total_pts, (t.sid = v_student_id)
  FROM totals t
  WHERE t.rnk <= v_top OR t.sid = v_student_id
  ORDER BY t.rnk;
END;
$function$;

-- get_led_group_member_points(p_group_id bigint, p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_led_group_member_points(p_group_id bigint, p_timeframe_id bigint)
 RETURNS TABLE(student_id bigint, first_name text, last_name text, total_points bigint, category_breakdown jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
BEGIN
  SELECT cs.student_id INTO v_student_id FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_group_leaders sgl
    WHERE sgl.group_id = p_group_id AND sgl.student_id = v_student_id
  ) THEN
    RETURN;
  END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH members AS (
    SELECT s.id AS sid, s.first_name AS fname, s.last_name AS lname
    FROM public.student_group_pair sgp
    JOIN public.student s ON s.id = sgp.student_id
    WHERE sgp.student_group_id = p_group_id
  ),
  totals AS (
    SELECT
      m.sid,
      m.fname,
      m.lname,
      COALESCE(SUM(sp.point_value), 0)::bigint AS total_pts
    FROM members m
    LEFT JOIN public.student_point sp ON sp.student_id = m.sid
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    GROUP BY m.sid, m.fname, m.lname
  ),
  cats AS (
    SELECT
      m.sid,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'point_group_id', pg.id,
          'point_group_name', pg.name,
          'points', cat.pts
        ) ORDER BY pg.name
      ) FILTER (WHERE pg.id IS NOT NULL), '[]'::jsonb) AS breakdown
    FROM members m
    LEFT JOIN LATERAL (
      SELECT pe.point_group_id AS pgid, SUM(sp.point_value)::bigint AS pts
      FROM public.student_point sp
      JOIN public.point_event pe ON pe.id = sp.point_event_id
        AND pe.date >= v_starts
        AND pe.date <= v_ends
        AND pe.point_group_id IS NOT NULL
      WHERE sp.student_id = m.sid
      GROUP BY pe.point_group_id
    ) cat ON true
    LEFT JOIN public.point_group pg ON pg.id = cat.pgid
    GROUP BY m.sid
  )
  SELECT t.sid, t.fname, t.lname, t.total_pts, COALESCE(c.breakdown, '[]'::jsonb)
  FROM totals t
  LEFT JOIN cats c ON c.sid = t.sid
  ORDER BY t.total_pts DESC, t.lname, t.fname;
END;
$function$;

-- get_my_groups(p_timeframe_id bigint)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_my_groups(p_timeframe_id bigint)
 RETURNS TABLE(group_id bigint, group_name text, is_leader boolean, ranking_group_id bigint, ranking_group_name text, member_count bigint, points_per_student bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH current_student AS (
    SELECT student_id FROM auth_current_student()
  )
  SELECT
    sg.id::bigint AS group_id,
    sg.name::text AS group_name,
    EXISTS(
      SELECT 1 FROM public.student_group_leaders sgl
      WHERE sgl.group_id = sg.id
        AND sgl.student_id = (SELECT student_id FROM current_student)
    ) AS is_leader,
    rg.id AS ranking_group_id,
    rg.name AS ranking_group_name,
    (
      SELECT COUNT(*)::bigint
      FROM public.student_group_pair sgp2
      WHERE sgp2.student_group_id = sg.id
    ) AS member_count,
    COALESCE(sg.points_per_student, 0)::bigint AS points_per_student
  FROM current_student cs
  JOIN public.student_group_pair sgp ON sgp.student_id = cs.student_id
  JOIN public.student_group sg ON sg.id = sgp.student_group_id
    AND sg.archived = false
    AND (sg.timeframe_id IS NULL OR sg.timeframe_id = p_timeframe_id)
  LEFT JOIN LATERAL (
    SELECT r.id, r.name
    FROM public.ranking_group_pair rgp
    JOIN public.ranking_group r ON r.id = rgp.ranking_group_id
    WHERE rgp.student_group_id = sg.id
      AND r.timeframe_id = p_timeframe_id
    ORDER BY r.name
    LIMIT 1
  ) rg ON true
  ORDER BY sg.name;
$function$;

-- get_my_visibility_snapshot(p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_my_visibility_snapshot(p_timeframe_id bigint)
 RETURNS TABLE(timeframe_id bigint, leaderboard_top_overall integer, leaderboard_top_per_category integer, leaderboard_top_per_grade integer, rank_lookahead integer, change_window_days integer, led_group_ids bigint[], student_id bigint, grade bigint, overall_rank bigint, grade_rank bigint, category_ranks jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_school_id  bigint;
  v_grade      bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_cfg        RECORD;
  v_overall_rank bigint;
  v_grade_rank   bigint;
  v_led_groups   bigint[];
  v_category_ranks jsonb;
BEGIN
  SELECT cs.student_id, cs.school_id, cs.grade
  INTO v_student_id, v_school_id, v_grade
  FROM auth_current_student() cs;

  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;

  IF v_starts IS NULL THEN RETURN; END IF;

  SELECT * INTO v_cfg FROM visibility_config();

  SELECT r.rnk INTO v_overall_rank
  FROM (
    SELECT
      s.id AS sid,
      RANK() OVER (ORDER BY COALESCE(SUM(sp.point_value), 0) DESC)::bigint AS rnk
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    WHERE s.school_id = v_school_id
    GROUP BY s.id
  ) r
  WHERE r.sid = v_student_id;

  SELECT r.rnk INTO v_grade_rank
  FROM (
    SELECT
      s.id AS sid,
      RANK() OVER (ORDER BY COALESCE(SUM(sp.point_value), 0) DESC)::bigint AS rnk
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    WHERE s.school_id = v_school_id AND s.grade = v_grade
    GROUP BY s.id
  ) r
  WHERE r.sid = v_student_id;

  SELECT COALESCE(array_agg(sgl.group_id ORDER BY sgl.group_id), ARRAY[]::bigint[])
  INTO v_led_groups
  FROM public.student_group_leaders sgl
  JOIN public.student_group sg ON sg.id = sgl.group_id AND sg.archived = false
  WHERE sgl.student_id = v_student_id
    AND (sg.timeframe_id IS NULL OR sg.timeframe_id = p_timeframe_id);

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'point_group_id', r.point_group_id,
      'point_group_name', r.point_group_name,
      'rank', r.rnk
    ) ORDER BY r.point_group_name
  ), '[]'::jsonb)
  INTO v_category_ranks
  FROM (
    SELECT
      pg.id AS point_group_id,
      pg.name AS point_group_name,
      s.id AS sid,
      RANK() OVER (
        PARTITION BY pg.id
        ORDER BY SUM(sp.point_value) DESC
      )::bigint AS rnk
    FROM public.point_group pg
    JOIN public.student s ON s.school_id = v_school_id
    JOIN public.student_point sp ON sp.student_id = s.id
    JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.point_group_id = pg.id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    WHERE pg.school_id = v_school_id AND pg.ranked = true
    GROUP BY pg.id, pg.name, s.id
  ) r
  WHERE r.sid = v_student_id;

  RETURN QUERY SELECT
    p_timeframe_id,
    v_cfg.leaderboard_top_overall,
    v_cfg.leaderboard_top_per_category,
    v_cfg.leaderboard_top_per_grade,
    v_cfg.rank_lookahead,
    v_cfg.change_window_days,
    v_led_groups,
    v_student_id,
    v_grade,
    v_overall_rank,
    v_grade_rank,
    v_category_ranks;
END;
$function$;

-- get_own_admin_data()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_own_admin_data()
 RETURNS SETOF admin
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select *
  from admin
  where id in (SELECT admin_id FROM get_user_data())
$function$;

-- get_own_teacher_data()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_own_teacher_data()
 RETURNS SETOF teacher
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select *
  from teacher
  where id in (SELECT teacher_id FROM get_user_data())
$function$;

-- get_point_group_leaderboard(p_point_group_id bigint, p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_point_group_leaderboard(p_point_group_id bigint, p_timeframe_id bigint)
 RETURNS TABLE(rank bigint, student_id bigint, first_name text, last_name text, total_points bigint, points_change bigint, rank_change bigint, is_current_student boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_cutoff     timestamptz;
  v_top        integer;
  v_lookahead  integer;
  v_days       integer;
BEGIN
  SELECT cs.student_id, cs.school_id
  INTO v_student_id, v_school_id
  FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  SELECT vc.leaderboard_top_per_category, vc.rank_lookahead, vc.change_window_days
  INTO v_top, v_lookahead, v_days
  FROM visibility_config() vc;

  v_cutoff := visibility_change_cutoff(v_starts, v_ends, v_days);

  RETURN QUERY
  WITH pts AS (
    SELECT
      s.id AS sid,
      s.first_name AS fname,
      s.last_name AS lname,
      COALESCE(SUM(sp.point_value) FILTER (
        WHERE pe.id IS NOT NULL AND pe.date >= v_starts AND pe.date <= v_ends
      ), 0)::bigint AS total_pts,
      COALESCE(SUM(sp.point_value) FILTER (
        WHERE pe.id IS NOT NULL AND pe.date >= v_starts AND pe.date < v_cutoff
      ), 0)::bigint AS prev_pts
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.point_group_id = p_point_group_id
    WHERE s.school_id = v_school_id
    GROUP BY s.id, s.first_name, s.last_name
    HAVING COALESCE(SUM(sp.point_value) FILTER (
      WHERE pe.id IS NOT NULL AND pe.date >= v_starts AND pe.date <= v_ends
    ), 0) > 0
       OR s.id = v_student_id
  ),
  ranked AS (
    SELECT
      sid, fname, lname, total_pts, prev_pts,
      RANK() OVER (ORDER BY total_pts DESC)::bigint AS rnk_now,
      RANK() OVER (ORDER BY prev_pts DESC)::bigint AS rnk_prev
    FROM pts
  ),
  my_rank AS (
    SELECT rnk_now FROM ranked WHERE sid = v_student_id
  )
  SELECT
    r.rnk_now,
    r.sid,
    r.fname,
    r.lname,
    r.total_pts,
    (r.total_pts - r.prev_pts)::bigint,
    (r.rnk_prev - r.rnk_now)::bigint,
    (r.sid = v_student_id)
  FROM ranked r
  WHERE r.rnk_now <= v_top
     OR r.sid = v_student_id
     OR (
       (SELECT rnk_now FROM my_rank) IS NOT NULL
       AND r.rnk_now < (SELECT rnk_now FROM my_rank)
       AND r.rnk_now >= (SELECT rnk_now FROM my_rank) - v_lookahead
     )
  ORDER BY r.rnk_now;
END;
$function$;

-- get_point_groups_as_admin(school_id integer)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_point_groups_as_admin(school_id integer)
 RETURNS SETOF point_group
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select point_group.*
  from point_group
  where
  point_group.school_id in (select id from get_schools_as_admin())
  and point_group.school_id = school_id
$function$;

-- get_point_history(p_timeframe_id bigint, p_page integer, p_page_size integer)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_point_history(p_timeframe_id bigint, p_page integer, p_page_size integer)
 RETURNS TABLE(id bigint, event_name text, point_group_name text, point_group_color text, point_value bigint, event_date timestamp with time zone, event_rank bigint, event_participant_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  WITH current_student AS (
    SELECT u.student_id
    FROM public."user" u
    WHERE u.supabase_id = auth.uid()
  ),
  tf AS (
    SELECT starts_at, ends_at FROM public.school_timeframes WHERE id = p_timeframe_id
  ),
  my_event_ids AS (
    SELECT DISTINCT sp.point_event_id
    FROM public.student_point sp
    JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= (SELECT starts_at FROM tf)
      AND pe.date <= (SELECT ends_at FROM tf)
    WHERE sp.student_id = (SELECT student_id FROM current_student)
  ),
  event_ranks AS (
    SELECT
      sp2.id AS student_point_id,
      RANK() OVER (PARTITION BY sp2.point_event_id ORDER BY sp2.point_value DESC)::bigint AS event_rank,
      COUNT(*) OVER (PARTITION BY sp2.point_event_id)::bigint                             AS participant_count
    FROM public.student_point sp2
    WHERE sp2.point_event_id IN (SELECT point_event_id FROM my_event_ids)
  )
  SELECT
    sp.id,
    COALESCE(pe.name, pt.name)  AS event_name,
    pg.name                      AS point_group_name,
    pg.color                     AS point_group_color,
    sp.point_value,
    pe.date                      AS event_date,
    er.event_rank,
    er.participant_count         AS event_participant_count
  FROM current_student cs
  JOIN public.student_point sp ON sp.student_id = cs.student_id
  JOIN public.point_event pe ON pe.id = sp.point_event_id
    AND pe.date >= (SELECT starts_at FROM tf)
    AND pe.date <= (SELECT ends_at FROM tf)
  LEFT JOIN public.point_group    pg ON pg.id = pe.point_group_id
  LEFT JOIN public.point_template pt ON pt.id = pe.template_id
  JOIN event_ranks er ON er.student_point_id = sp.id
  ORDER BY pe.date DESC, sp.id DESC
  LIMIT  p_page_size
  OFFSET (p_page - 1) * p_page_size;
$function$;

-- get_ranking_group_leaderboard(p_ranking_group_id bigint, p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_ranking_group_leaderboard(p_ranking_group_id bigint, p_timeframe_id bigint)
 RETURNS TABLE(rank bigint, group_id bigint, group_name text, avg_student_points numeric, group_points bigint, top_student_points bigint, total_score numeric, is_current_student_group boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_rg_tf      bigint;
BEGIN
  SELECT cs.student_id INTO v_student_id FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT rg.timeframe_id INTO v_rg_tf
  FROM public.ranking_group rg
  WHERE rg.id = p_ranking_group_id;

  IF v_rg_tf IS DISTINCT FROM p_timeframe_id THEN
    RETURN;
  END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH member_groups AS (
    SELECT rgp.student_group_id AS sgid
    FROM public.ranking_group_pair rgp
    WHERE rgp.ranking_group_id = p_ranking_group_id
  ),
  student_pts AS (
    SELECT
      sgp.student_group_id AS sgid,
      sgp.student_id AS sid,
      COALESCE(SUM(sp.point_value), 0)::bigint AS student_total
    FROM public.student_group_pair sgp
    JOIN member_groups mg ON mg.sgid = sgp.student_group_id
    LEFT JOIN public.student_point sp ON sp.student_id = sgp.student_id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    GROUP BY sgp.student_group_id, sgp.student_id
  ),
  group_avg AS (
    SELECT sgid, AVG(student_total) AS avg_pts
    FROM student_pts
    GROUP BY sgid
  ),
  group_top AS (
    SELECT DISTINCT ON (sgid)
      sgid,
      student_total AS top_pts
    FROM student_pts
    ORDER BY sgid, student_total DESC
  ),
  group_exclusive_pts AS (
    SELECT
      sgp_pt.student_group_id AS sgid,
      COALESCE(SUM(sgp_pt.value), 0)::bigint AS group_pts
    FROM public.student_group_point sgp_pt
    JOIN public.ranking_group_point_event rgpe
      ON rgpe.id = sgp_pt.ranking_group_point_event_id
      AND rgpe.ranking_group_id = p_ranking_group_id
      AND rgpe.date >= v_starts
      AND rgpe.date <= v_ends
    GROUP BY sgp_pt.student_group_id
  ),
  current_student_groups AS (
    SELECT rgp.student_group_id AS sgid
    FROM public.ranking_group_pair rgp
    JOIN public.student_group_pair sgp
      ON sgp.student_group_id = rgp.student_group_id
      AND sgp.student_id = v_student_id
    WHERE rgp.ranking_group_id = p_ranking_group_id
  ),
  scores AS (
    SELECT
      sg.id AS gid,
      sg.name::text AS gname,
      COALESCE(ga.avg_pts, 0) AS avg_pts,
      COALESCE(gep.group_pts, 0)::bigint AS gpts,
      COALESCE(gt.top_pts, 0)::bigint AS top_pts,
      COALESCE(ga.avg_pts, 0) + COALESCE(gep.group_pts, 0) AS score,
      (sg.id IN (SELECT csg.sgid FROM current_student_groups csg)) AS is_mine
    FROM member_groups mg
    JOIN public.student_group sg ON sg.id = mg.sgid
    LEFT JOIN group_avg ga ON ga.sgid = sg.id
    LEFT JOIN group_top gt ON gt.sgid = sg.id
    LEFT JOIN group_exclusive_pts gep ON gep.sgid = sg.id
  )
  SELECT
    RANK() OVER (ORDER BY sc.score DESC)::bigint,
    sc.gid,
    sc.gname,
    sc.avg_pts,
    sc.gpts,
    sc.top_pts,
    sc.score,
    sc.is_mine
  FROM scores sc
  ORDER BY 1;
END;
$function$;

-- get_school(school_id integer)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school(school_id integer)
 RETURNS SETOF school
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select *
  from school
  where id in (select id from get_schools_as_admin())
  and id = school_id
$function$;

-- get_school_leaderboard(p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school_leaderboard(p_timeframe_id bigint)
 RETURNS TABLE(rank bigint, student_id bigint, first_name text, last_name text, total_points bigint, points_change bigint, rank_change bigint, is_current_student boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_cutoff     timestamptz;
  v_top        integer;
  v_lookahead  integer;
  v_days       integer;
BEGIN
  SELECT cs.student_id, cs.school_id
  INTO v_student_id, v_school_id
  FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  SELECT vc.leaderboard_top_overall, vc.rank_lookahead, vc.change_window_days
  INTO v_top, v_lookahead, v_days
  FROM visibility_config() vc;

  v_cutoff := visibility_change_cutoff(v_starts, v_ends, v_days);

  RETURN QUERY
  WITH pts AS (
    SELECT
      s.id AS sid,
      s.first_name AS fname,
      s.last_name AS lname,
      COALESCE(SUM(sp.point_value) FILTER (
        WHERE pe.date >= v_starts AND pe.date <= v_ends
      ), 0)::bigint AS total_pts,
      COALESCE(SUM(sp.point_value) FILTER (
        WHERE pe.date >= v_starts AND pe.date < v_cutoff
      ), 0)::bigint AS prev_pts
    FROM public.student s
    LEFT JOIN public.student_point sp ON sp.student_id = s.id
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
    WHERE s.school_id = v_school_id
    GROUP BY s.id, s.first_name, s.last_name
  ),
  ranked AS (
    SELECT
      sid,
      fname,
      lname,
      total_pts,
      prev_pts,
      RANK() OVER (ORDER BY total_pts DESC)::bigint AS rnk_now,
      RANK() OVER (ORDER BY prev_pts DESC)::bigint AS rnk_prev
    FROM pts
  ),
  my_rank AS (
    SELECT rnk_now FROM ranked WHERE sid = v_student_id
  )
  SELECT
    r.rnk_now,
    r.sid,
    r.fname,
    r.lname,
    r.total_pts,
    (r.total_pts - r.prev_pts)::bigint,
    (r.rnk_prev - r.rnk_now)::bigint,
    (r.sid = v_student_id)
  FROM ranked r
  WHERE r.rnk_now <= v_top
     OR r.sid = v_student_id
     OR (
       (SELECT rnk_now FROM my_rank) IS NOT NULL
       AND r.rnk_now < (SELECT rnk_now FROM my_rank)
       AND r.rnk_now >= (SELECT rnk_now FROM my_rank) - v_lookahead
     )
  ORDER BY r.rnk_now;
END;
$function$;

-- get_school_student_as_admin(provided_school_id integer, provided_student_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school_student_as_admin(provided_school_id integer, provided_student_id integer)
 RETURNS SETOF student
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select *
    from student
    where student.school_id = provided_school_id and student.id = provided_student_id;
end;
$function$;

-- get_school_students_as_admin(provided_school_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school_students_as_admin(provided_school_id integer)
 RETURNS SETOF student
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select *
    from student
    where student.school_id = provided_school_id;
end;
$function$;

-- get_school_teacher_as_admin(provided_school_id integer, provided_teacher_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school_teacher_as_admin(provided_school_id integer, provided_teacher_id integer)
 RETURNS TABLE(teacher_id bigint, first_name text, last_name text, link_code text, user_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select teacher.id, teacher.first_name, teacher.last_name, teacher.link_code, "user".id
    from teacher
    left join "user" on teacher.id = "user".teacher_id
    where teacher.school_id = provided_school_id and teacher.id = provided_teacher_id;
end;
$function$;

-- get_school_teachers_as_admin(provided_school_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_school_teachers_as_admin(provided_school_id integer)
 RETURNS TABLE(teacher_id bigint, first_name text, last_name text, link_code text, user_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select
    teacher.id,
    teacher.first_name,
    teacher.last_name,
    teacher.link_code,
    "user".id
  from teacher
  left join "user" on teacher.id = "user".teacher_id
  where teacher.school_id = provided_school_id;
end;
$function$;

-- get_schools_as_admin()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_schools_as_admin()
 RETURNS SETOF school
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select school.*
  from school
  join admin_school_pair on (school.id = admin_school_pair.school_id)
  where admin_school_pair.admin_id in (select id from get_own_admin_data())
$function$;

-- get_student_group_as_admin(provided_school_id integer, provided_group_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_student_group_as_admin(provided_school_id integer, provided_group_id integer)
 RETURNS TABLE(id bigint, name character varying, parent_id bigint, child_groups student_group[], teachers teacher[], students student[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select 
    sg.id, 
    sg.name, 
    sg.parent_id, 
    array_agg(distinct children.*) as child_groups, 
    array_agg(distinct t.*) as teachers,
    array_agg(distinct s.*) as students
  from student_group sg
  left join student_group children on sg.id = children.parent_id
  left join teacher_student_group_pair tg on sg.id = tg.group_id
  left join teacher t on tg.teacher_id = t.id
  left join student_group_pair sgp on sg.id = sgp.student_group_id
  left join student s on sgp.student_id = s.id
  where sg.id = provided_group_id and sg.school_id = provided_school_id
  group by sg.id, sg.name;
end;$function$;

-- get_student_group_leaderboard(p_group_id bigint, p_timeframe_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_student_group_leaderboard(p_group_id bigint, p_timeframe_id bigint)
 RETURNS TABLE(group_id bigint, group_name text, member_count bigint, avg_points numeric, is_leader boolean, is_member boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_student_id bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_is_member  boolean;
  v_is_leader  boolean;
BEGIN
  SELECT cs.student_id INTO v_student_id FROM auth_current_student() cs;
  IF v_student_id IS NULL THEN RETURN; END IF;

  SELECT tb.starts_at, tb.ends_at
  INTO v_starts, v_ends
  FROM timeframe_bounds(p_timeframe_id) tb;
  IF v_starts IS NULL THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.student_group_pair sgp
    WHERE sgp.student_group_id = p_group_id AND sgp.student_id = v_student_id
  ) INTO v_is_member;

  SELECT EXISTS(
    SELECT 1 FROM public.student_group_leaders sgl
    WHERE sgl.group_id = p_group_id AND sgl.student_id = v_student_id
  ) INTO v_is_leader;

  IF NOT v_is_member AND NOT v_is_leader THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT sgp.student_id AS sid
    FROM public.student_group_pair sgp
    WHERE sgp.student_group_id = p_group_id
  ),
  member_pts AS (
    SELECT
      m.sid,
      COALESCE(SUM(sp.point_value), 0)::bigint AS pts
    FROM members m
    LEFT JOIN public.student_point sp ON sp.student_id = m.sid
    LEFT JOIN public.point_event pe ON pe.id = sp.point_event_id
      AND pe.date >= v_starts
      AND pe.date <= v_ends
    GROUP BY m.sid
  )
  SELECT
    sg.id::bigint,
    sg.name::text,
    (SELECT COUNT(*)::bigint FROM members),
    (SELECT COALESCE(AVG(mp.pts), 0) FROM member_pts mp),
    v_is_leader,
    v_is_member
  FROM public.student_group sg
  WHERE sg.id = p_group_id
    AND sg.archived = false
    AND (sg.timeframe_id IS NULL OR sg.timeframe_id = p_timeframe_id);
END;
$function$;

-- get_student_group_students_as_admin(provided_school_id integer, provided_student_group_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_student_group_students_as_admin(provided_school_id integer, provided_student_group_id integer)
 RETURNS SETOF student
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  return query
  select student.*
    from student
    join student_group_pair on (student.id = student_group_pair.student_id)
    join student_group on (student_group_pair.student_group_id = student_group.id)
    where student.school_id = provided_school_id and student_group.id = provided_student_group_id;
end;
$function$;

-- get_student_groups_as_admin(school_id integer)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_student_groups_as_admin(school_id integer)
 RETURNS SETOF student_group
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select student_group.*
  from student_group
  where
  student_group.school_id in (select id from get_schools_as_admin())
  and student_group.school_id = school_id
$function$;

-- get_user_data()  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.get_user_data()
 RETURNS SETOF "user"
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select *
  from "user"
  where supabase_id = auth.uid();
$function$;

-- handle_new_user()  lang=plpgsql security_definer=True config={"search_path=\"\""}
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.user (supabase_id)
  values (new.id);
  return new;
end;
$function$;

-- remove_student_from_student_group(provided_student_id bigint, provided_student_group_id bigint)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.remove_student_from_student_group(provided_student_id bigint, provided_student_group_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_student_group(provided_student_group_id);
  perform check_admin_access_to_student(provided_student_id);

  delete from student_group_pair
  where student_id = provided_student_id and student_group_id = provided_student_group_id;
end;
$function$;

-- remove_teacher_from_student_group(provided_school_id integer, provided_teacher_id integer, provided_group_id integer)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.remove_teacher_from_student_group(provided_school_id integer, provided_teacher_id integer, provided_group_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_school(provided_school_id);

  delete
  from teacher_student_group_pair tsgp
  where tsgp.teacher_id = provided_teacher_id and tsgp.group_id = provided_group_id;
end;
$function$;

-- timeframe_bounds(p_timeframe_id bigint)  lang=sql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.timeframe_bounds(p_timeframe_id bigint)
 RETURNS TABLE(id bigint, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT st.id, st.starts_at, st.ends_at
  FROM public.school_timeframes st
  WHERE st.id = p_timeframe_id;
$function$;

-- update_student_data(provided_student_id bigint, provided_student_first_name text, provided_student_last_name text, provided_student_birthdate date, provided_student_grade bigint, provided_student_gender text)  lang=plpgsql security_definer=True config=None
CREATE OR REPLACE FUNCTION public.update_student_data(provided_student_id bigint, provided_student_first_name text, provided_student_last_name text, provided_student_birthdate date, provided_student_grade bigint, provided_student_gender text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform check_admin_access_to_student(provided_student_id);

  update student
  set
    first_name = provided_student_first_name,
    last_name = provided_student_last_name,
    birthdate = provided_student_birthdate,
    grade = provided_student_grade,
    gender = provided_student_gender
  where
    id = provided_student_id;
end;
$function$;

-- visibility_change_cutoff(p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_days integer)  lang=sql security_definer=False config=None
CREATE OR REPLACE FUNCTION public.visibility_change_cutoff(p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_days integer)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT GREATEST(
    p_starts_at,
    LEAST(p_ends_at, CURRENT_TIMESTAMP) - make_interval(days => p_days)
  );
$function$;

-- visibility_config()  lang=sql security_definer=False config=None
CREATE OR REPLACE FUNCTION public.visibility_config()
 RETURNS TABLE(leaderboard_top_overall integer, leaderboard_top_per_category integer, leaderboard_top_per_grade integer, rank_lookahead integer, change_window_days integer)
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT
    10::integer AS leaderboard_top_overall,
    10::integer AS leaderboard_top_per_category,
    10::integer AS leaderboard_top_per_grade,
    2::integer  AS rank_lookahead,
    7::integer  AS change_window_days;
$function$;

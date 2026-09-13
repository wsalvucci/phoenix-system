alter table public.point_event
  add column conversion_formula text;

alter table public.point_event
  add constraint point_event_conversion_formula_length
  check (conversion_formula is null or length(conversion_formula) <= 200);

create or replace function public.duplicate_scorebook_events(
  provided_teacher_id bigint,
  provided_student_group_id bigint,
  provided_source_timeframe_id bigint,
  provided_shift_amount integer,
  provided_shift_unit text,
  provided_expected_source_event_ids bigint[],
  provided_destination_timeframe_id bigint default null,
  provided_excluded_event_ids bigint[] default '{}',
  provided_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.duplicate_scorebook_events(bigint, bigint, bigint, integer, text, bigint[], bigint, bigint[], uuid) from public, anon, authenticated;
grant execute on function public.duplicate_scorebook_events(bigint, bigint, bigint, integer, text, bigint[], bigint, bigint[], uuid) to service_role;

create or replace function public.edit_scorebook_point_event(
  provided_point_event_id bigint,
  provided_student_group_id bigint,
  provided_date timestamptz,
  provided_name text,
  provided_max_input bigint,
  provided_conversion_formula text,
  provided_point_group_id bigint,
  provided_student_points jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(provided_student_points) is distinct from 'array' then
    raise exception 'Student points must be an array';
  end if;

  update public.point_event
  set date = provided_date,
      name = provided_name,
      max_input = provided_max_input,
      conversion_formula = nullif(btrim(provided_conversion_formula), ''),
      point_group_id = provided_point_group_id
  where id = provided_point_event_id
    and student_group_id = provided_student_group_id;

  if not found then
    raise exception 'Point event not found in this student group';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(provided_student_points) as item
    left join public.student_group_pair pair
      on pair.student_group_id = provided_student_group_id
     and pair.student_id = (item->>'student_id')::bigint
    where pair.student_id is null
  ) then
    raise exception 'A student does not belong to this student group';
  end if;

  insert into public.student_point (student_id, point_event_id, point_value, input_score, notes)
  select
    (item->>'student_id')::bigint,
    provided_point_event_id,
    (item->>'point_value')::bigint,
    (item->>'input_score')::bigint,
    item->>'notes'
  from jsonb_array_elements(provided_student_points) as item
  on conflict (student_id, point_event_id) do update
  set point_value = excluded.point_value,
      input_score = excluded.input_score,
      notes = excluded.notes;
end;
$$;

revoke all on function public.edit_scorebook_point_event(bigint, bigint, timestamptz, text, bigint, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.edit_scorebook_point_event(bigint, bigint, timestamptz, text, bigint, text, bigint, jsonb) to service_role;

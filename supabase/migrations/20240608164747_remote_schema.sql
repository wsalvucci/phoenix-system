set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_school_and_pair_admin(admin_id integer, school_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$DECLARE
    new_school_id uuid;
BEGIN
    -- Insert into school table and get the new school ID
    INSERT INTO school (name) VALUES (school_name) RETURNING id INTO new_school_id;

    -- Insert the pair into admin_school_pair
    INSERT INTO admin_school_pair (admin_id, school_id) VALUES (admin_id, new_school_id);
END;$function$
;



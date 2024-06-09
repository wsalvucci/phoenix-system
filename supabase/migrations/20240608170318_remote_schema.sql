set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_school_and_pair_admin(admin_id integer, school_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
    new_school_id uuid;
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
END;$function$
;



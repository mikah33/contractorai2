-- NUCLEAR DATABASE CLEAR - REMOVE ALL TABLES EXCEPT PROFILES
-- This will find and drop every single table in your database except profiles

DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- Get all table names in the public schema except 'profiles'
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != 'profiles'
    LOOP
        -- Drop each table with CASCADE to handle dependencies
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(rec.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', rec.tablename;
    END LOOP;
END $$;

-- Also drop any views that might exist (except those related to profiles)
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname NOT LIKE '%profiles%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(rec.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', rec.viewname;
    END LOOP;
END $$;

-- Drop any sequences that might exist (except those for profiles)
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
        AND sequencename NOT LIKE '%profiles%'
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(rec.sequencename) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', rec.sequencename;
    END LOOP;
END $$;

-- Show remaining tables (should only be profiles)
SELECT 'NUCLEAR CLEAR COMPLETE! Remaining tables:' as status;
SELECT tablename as remaining_tables 
FROM pg_tables 
WHERE schemaname = 'public';
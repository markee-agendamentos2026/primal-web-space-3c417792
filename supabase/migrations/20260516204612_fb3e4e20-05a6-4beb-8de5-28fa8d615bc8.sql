-- The profiles table is used both for authenticated users AND for anonymous booking clients
-- (created via ensure_client_profile with a generated UUID). The FK to auth.users blocks
-- the client-side flow. Drop it so anonymous client profiles can exist.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Keep handle_new_user trigger logic working: profile rows for real auth users still
-- use auth.users.id as their id (handle_new_user inserts with new.id). For anonymous
-- booking clients, ensure_client_profile creates a standalone UUID. Both coexist now.

-- Make sure the auth trigger exists (it may have been dropped). Recreate if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;
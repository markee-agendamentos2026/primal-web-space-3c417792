-- Habilita Realtime nas tabelas usadas pelo app (Supabase DEVELOP).
-- Database → Replication → ou rode no SQL Editor:

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.professionals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

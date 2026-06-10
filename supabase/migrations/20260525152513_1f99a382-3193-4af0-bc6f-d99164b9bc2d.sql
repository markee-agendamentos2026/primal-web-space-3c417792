ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_cep text,
  ADD COLUMN IF NOT EXISTS client_street text,
  ADD COLUMN IF NOT EXISTS client_number text,
  ADD COLUMN IF NOT EXISTS client_complement text,
  ADD COLUMN IF NOT EXISTS client_neighborhood text,
  ADD COLUMN IF NOT EXISTS client_city text,
  ADD COLUMN IF NOT EXISTS client_state text,
  ADD COLUMN IF NOT EXISTS client_address_full text;
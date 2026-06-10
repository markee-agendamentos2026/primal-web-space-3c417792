CREATE POLICY "public reads bookings" ON public.bookings FOR SELECT USING (true);

CREATE POLICY "client cancels own booking" ON public.bookings
  FOR UPDATE USING (true) WITH CHECK (status = 'cancelled');
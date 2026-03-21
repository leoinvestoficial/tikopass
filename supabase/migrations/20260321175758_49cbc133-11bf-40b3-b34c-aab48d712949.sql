
-- Tighten events insert policy - require authenticated and non-null fields
DROP POLICY "Authenticated users can insert events" ON public.events;
CREATE POLICY "Authenticated users can insert events" ON public.events 
  FOR INSERT TO authenticated 
  WITH CHECK (
    name IS NOT NULL AND 
    venue IS NOT NULL AND 
    city IS NOT NULL AND 
    category IS NOT NULL
  );

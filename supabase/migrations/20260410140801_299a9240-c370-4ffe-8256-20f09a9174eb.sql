
-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Function to search events ignoring accents
CREATE OR REPLACE FUNCTION public.search_events_unaccent(search_term text, city_filter text DEFAULT NULL)
RETURNS SETOF public.events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.events
  WHERE public.unaccent(lower(name)) ILIKE '%' || public.unaccent(lower(search_term)) || '%'
    AND (city_filter IS NULL OR public.unaccent(lower(city)) ILIKE '%' || public.unaccent(lower(city_filter)) || '%')
    AND date >= CURRENT_DATE
  ORDER BY date ASC
  LIMIT 20;
$$;

-- Function to find duplicate/similar event before creating
CREATE OR REPLACE FUNCTION public.find_similar_event(
  event_name text,
  event_date date,
  event_city text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.events
  WHERE date = event_date
    AND public.unaccent(lower(city)) = public.unaccent(lower(event_city))
    AND public.unaccent(lower(name)) = public.unaccent(lower(event_name))
  LIMIT 1;
$$;

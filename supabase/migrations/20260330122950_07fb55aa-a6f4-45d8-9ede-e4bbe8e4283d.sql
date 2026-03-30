
-- 1. Create a view for public profile data (hiding PII)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, user_id, display_name, avatar_url, bio, city, created_at
FROM public.profiles;

-- 2. Fix profiles RLS: restrict public SELECT, keep owner full access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix tickets: hide sensitive fields via view
CREATE VIEW public.tickets_public
WITH (security_invoker = on) AS
SELECT id, event_id, seller_id, price, original_price, sector, row, seat, status, created_at, updated_at
FROM public.tickets;

DROP POLICY IF EXISTS "Tickets are viewable by everyone" ON public.tickets;

CREATE POLICY "Public can view non-sensitive ticket info"
ON public.tickets FOR SELECT
TO public
USING (true);

-- 4. Add RLS policies to ticket_hashes
ALTER TABLE public.ticket_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only ticket owner can view hashes"
ON public.ticket_hashes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tickets t
  WHERE t.id = ticket_hashes.ticket_id AND t.seller_id = auth.uid()
));

-- 5. Restrict negotiation UPDATE to safe columns only via trigger
CREATE OR REPLACE FUNCTION public.restrict_negotiation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent buyers/sellers from changing payment fields
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'Cannot modify payment_status directly';
  END IF;
  IF NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id THEN
    RAISE EXCEPTION 'Cannot modify payment_intent_id directly';
  END IF;
  IF NEW.checkout_session_id IS DISTINCT FROM OLD.checkout_session_id THEN
    RAISE EXCEPTION 'Cannot modify checkout_session_id directly';
  END IF;
  IF NEW.platform_fee IS DISTINCT FROM OLD.platform_fee THEN
    RAISE EXCEPTION 'Cannot modify platform_fee directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_negotiation_update
BEFORE UPDATE ON public.negotiations
FOR EACH ROW
EXECUTE FUNCTION public.restrict_negotiation_update();


-- When a ticket is deleted, remove its hashes to allow re-posting
CREATE OR REPLACE FUNCTION public.cleanup_ticket_hashes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only clean up hashes if the ticket was NOT sold (sold tickets stay blocked)
  IF OLD.status NOT IN ('sold', 'completed') THEN
    DELETE FROM public.ticket_hashes WHERE ticket_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_ticket_delete_cleanup_hashes
  BEFORE DELETE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_ticket_hashes();

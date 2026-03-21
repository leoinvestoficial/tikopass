
-- Add payment tracking to negotiations
ALTER TABLE public.negotiations 
  ADD COLUMN payment_intent_id TEXT,
  ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded')),
  ADD COLUMN platform_fee NUMERIC(10,2),
  ADD COLUMN checkout_session_id TEXT;

-- Add status 'paid' to the ticket status check
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('available', 'negotiating', 'sold', 'paid'));

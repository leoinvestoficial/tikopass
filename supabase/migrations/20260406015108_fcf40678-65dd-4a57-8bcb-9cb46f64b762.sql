
-- Add source_platform to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS source_platform text;

-- Create ticket_transfers table
CREATE TABLE public.ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_transfer',
  platform text,
  guarantee_level text NOT NULL DEFAULT 'yellow',
  transfer_instructions text,
  transferred_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own transfers"
  ON public.ticket_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Seller can update transfer status"
  ON public.ticket_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Create disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyer can create dispute"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Trigger to update updated_at
CREATE TRIGGER update_ticket_transfers_updated_at
  BEFORE UPDATE ON public.ticket_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

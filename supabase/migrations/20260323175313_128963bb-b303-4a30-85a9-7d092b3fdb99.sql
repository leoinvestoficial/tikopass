
-- Wallet transactions table for seller payouts
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  negotiation_id uuid REFERENCES public.negotiations(id),
  type text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'refund')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'refunded')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  withdrawn_at timestamptz
);

-- RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for wallet_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;

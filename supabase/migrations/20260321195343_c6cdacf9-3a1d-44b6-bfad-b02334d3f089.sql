
-- Seller ratings table
CREATE TABLE public.seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  negotiation_id uuid REFERENCES public.negotiations(id) ON DELETE CASCADE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (negotiation_id, buyer_id)
);

ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can see ratings
CREATE POLICY "Ratings are viewable by everyone"
  ON public.seller_ratings FOR SELECT
  TO public
  USING (true);

-- Buyers can insert ratings for completed negotiations
CREATE POLICY "Buyers can rate sellers"
  ON public.seller_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.negotiations n
      WHERE n.id = negotiation_id
        AND n.buyer_id = auth.uid()
        AND n.payment_status = 'paid'
    )
  );

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS access_type text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS event_days text[];
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS includes_open_bar boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_half_price boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS seller_description text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS extra_tags text[];

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_access_type_check
  CHECK (access_type IS NULL OR access_type IN ('passaporte','dia_unico','vip','camarote','open_bar','pista','meia_entrada','outro'));

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_seller_description_length
  CHECK (seller_description IS NULL OR char_length(seller_description) <= 500);
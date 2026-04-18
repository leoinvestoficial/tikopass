
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS pagarme_order_id TEXT;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS pagarme_charge_id TEXT;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS pagarme_pix_qr_code TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS pagarme_transfer_id TEXT;

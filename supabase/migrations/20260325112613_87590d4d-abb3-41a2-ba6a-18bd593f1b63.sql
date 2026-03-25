ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS validation_checks jsonb;
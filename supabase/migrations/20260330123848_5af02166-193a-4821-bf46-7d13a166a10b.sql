
-- Add KYC and photo moderation fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_document_path text,
  ADD COLUMN IF NOT EXISTS kyc_selfie_path text,
  ADD COLUMN IF NOT EXISTS pending_avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_status text NOT NULL DEFAULT 'approved';

-- Comment for clarity
COMMENT ON COLUMN public.profiles.kyc_status IS 'pending | submitted | approved | rejected';
COMMENT ON COLUMN public.profiles.avatar_status IS 'approved | pending | rejected';

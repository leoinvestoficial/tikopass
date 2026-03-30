
-- Allow authenticated users to view all profiles (needed for seller profiles, negotiations, etc.)
-- But block anonymous/public access to protect PII
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

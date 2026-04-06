-- Allow admins to view all disputes (the current policy only lets buyer/seller see their own)
-- We need a broader SELECT for admin emails
CREATE POLICY "Admins can view all disputes"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('matheus@tikopass.com', 'admin@tikopass.com', 'leonardo@bebaflow.com')
);

-- Allow admins to update disputes (resolve them)
CREATE POLICY "Admins can update disputes"
ON public.disputes
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('matheus@tikopass.com', 'admin@tikopass.com', 'leonardo@bebaflow.com')
)
WITH CHECK (
  auth.jwt() ->> 'email' IN ('matheus@tikopass.com', 'admin@tikopass.com', 'leonardo@bebaflow.com')
);
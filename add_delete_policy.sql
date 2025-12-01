-- Policy to allow admins to delete deals
CREATE POLICY "Admins can delete deals"
ON public.sales_deals
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.account_type = 'admin'
  )
);

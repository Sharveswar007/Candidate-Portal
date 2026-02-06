-- FIX: Infinite Recursion in Profiles RLS
-- The previous policy caused a loop because checking the role required querying the table being protected.

-- 1. Create a SECURITY DEFINER function to verify role (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_recruiter()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('recruiter', 'admin', 'hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Recruiters can view all profiles" ON public.profiles;

-- 3. Re-create the policy using the safe function
CREATE POLICY "Recruiters can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_recruiter()
);

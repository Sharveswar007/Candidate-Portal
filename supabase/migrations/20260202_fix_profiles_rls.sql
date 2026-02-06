-- Migration: Add RLS Policies for Profiles
-- Fixes 401 Unauthorized errors when fetching user role

-- 1. Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. Allow recruiters/admins to view ALL profiles (for candidate lists)
CREATE POLICY "Recruiters can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
    and role in ('recruiter', 'admin', 'hr')
  )
);

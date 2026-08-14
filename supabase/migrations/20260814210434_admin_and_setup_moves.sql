-- Add is_admin to profiles
ALTER TABLE public.profiles
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Add setup_moves to algorithm_cases
ALTER TABLE public.algorithm_cases
ADD COLUMN setup_moves text;

-- =========================================================================
-- RLS Policies for Admin Access
-- We allow users with is_admin = true to insert, update, delete cases/algs.
-- =========================================================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- algorithm_cases policies for admin
CREATE POLICY alg_cases_insert ON public.algorithm_cases
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY alg_cases_update ON public.algorithm_cases
  FOR UPDATE USING (public.is_admin());

CREATE POLICY alg_cases_delete ON public.algorithm_cases
  FOR DELETE USING (public.is_admin());

-- algorithms policies for admin
CREATE POLICY algorithms_insert ON public.algorithms
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY algorithms_update ON public.algorithms
  FOR UPDATE USING (public.is_admin());

CREATE POLICY algorithms_delete ON public.algorithms
  FOR DELETE USING (public.is_admin());

-- tutorial_series policies for admin
CREATE POLICY tut_series_insert ON public.tutorial_series
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY tut_series_update ON public.tutorial_series
  FOR UPDATE USING (public.is_admin());

CREATE POLICY tut_series_delete ON public.tutorial_series
  FOR DELETE USING (public.is_admin());

-- tutorial_steps policies for admin
CREATE POLICY tut_steps_insert ON public.tutorial_steps
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY tut_steps_update ON public.tutorial_steps
  FOR UPDATE USING (public.is_admin());

CREATE POLICY tut_steps_delete ON public.tutorial_steps
  FOR DELETE USING (public.is_admin());

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('ceo', 'team_member');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update team_member_reports policies to work with roles
DROP POLICY IF EXISTS "CEO can view all reports" ON public.team_member_reports;
DROP POLICY IF EXISTS "CEO can update reports" ON public.team_member_reports;

CREATE POLICY "CEO can view all reports"
ON public.team_member_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEO can update reports"
ON public.team_member_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ceo'));

-- Allow CEOs to insert reports for team members
CREATE POLICY "CEO can insert reports"
ON public.team_member_reports
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ceo'));

-- Add column to track if report is from CEO to team member
ALTER TABLE public.team_member_reports
ADD COLUMN is_from_ceo BOOLEAN DEFAULT false,
ADD COLUMN recipient_team_member_id UUID REFERENCES public.team_members(id);

-- Update existing team member report policies
DROP POLICY IF EXISTS "Team members can insert reports" ON public.team_member_reports;

CREATE POLICY "Team members can insert their reports"
ON public.team_member_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = team_member_id
    AND auth_user_id = auth.uid()
  )
  AND is_from_ceo = false
);

-- Team members can view reports sent TO them by CEO
CREATE POLICY "Team members can view reports sent to them"
ON public.team_member_reports
FOR SELECT
TO authenticated
USING (
  recipient_team_member_id IN (
    SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
  )
);
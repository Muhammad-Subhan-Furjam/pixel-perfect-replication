-- Remove unique constraint on check_ins to allow multiple check-ins per day
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_team_member_id_date_key;

-- Create table for team member daily reports
CREATE TABLE public.team_member_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  report_text TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_member_reports ENABLE ROW LEVEL SECURITY;

-- CEO can view all reports
CREATE POLICY "CEO can view all reports"
ON public.team_member_reports
FOR SELECT
USING (true);

-- Team members can insert their own reports
CREATE POLICY "Team members can insert reports"
ON public.team_member_reports
FOR INSERT
WITH CHECK (auth.uid() = team_member_id);

-- Team members can view their own reports
CREATE POLICY "Team members can view own reports"
ON public.team_member_reports
FOR SELECT
USING (auth.uid() = team_member_id);

-- CEO can update report read status
CREATE POLICY "CEO can update reports"
ON public.team_member_reports
FOR UPDATE
USING (true);

-- Add user_id to team_members to link with auth
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_member_reports_date ON public.team_member_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_team_member_reports_team_member ON public.team_member_reports(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_reports_is_read ON public.team_member_reports(is_read);
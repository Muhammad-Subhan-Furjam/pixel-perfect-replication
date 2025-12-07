-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executive_assistant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';

-- Create permissions table for CEO to manage access delegation
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_manage_team boolean NOT NULL DEFAULT false,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user can manage team
CREATE OR REPLACE FUNCTION public.can_manage_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'ceo') 
    OR EXISTS (
      SELECT 1 FROM public.user_permissions 
      WHERE user_id = _user_id AND can_manage_team = true
    )
$$;

-- RLS policies for user_permissions
CREATE POLICY "CEO can view all permissions"
ON public.user_permissions FOR SELECT
USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEO can manage permissions"
ON public.user_permissions FOR ALL
USING (public.has_role(auth.uid(), 'ceo'));

-- Create daily_metrics table for staff to submit metrics
CREATE TABLE public.daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  metrics jsonb NOT NULL DEFAULT '{}',
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_metrics
CREATE POLICY "Users can insert their own metrics"
ON public.daily_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own metrics"
ON public.daily_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "CEO can view all metrics"
ON public.daily_metrics FOR SELECT
USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "Users can update their own metrics on same day"
ON public.daily_metrics FOR UPDATE
USING (auth.uid() = user_id AND date = CURRENT_DATE);

-- Create reminder_logs table to track sent reminders
CREATE TABLE public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  reminder_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, reminder_date)
);

-- Enable RLS
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- CEO can view reminder logs
CREATE POLICY "CEO can view reminder logs"
ON public.reminder_logs FOR SELECT
USING (public.has_role(auth.uid(), 'ceo'));

-- Add department categories for better tracking
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS department_type text DEFAULT 'general' 
CHECK (department_type IN ('tech', 'hr', 'executive_assistant', 'general', 'sales', 'marketing', 'operations'));

-- Add tech-specific metrics columns to team_members target_metrics
-- These will be used as default KPIs for tech team members

-- Create trigger for user_permissions updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for daily_metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_metrics;
-- Add foreign key constraints with CASCADE delete for team_member related tables
ALTER TABLE public.team_member_reports
ADD CONSTRAINT fk_team_member_reports_team_member
FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

ALTER TABLE public.daily_metrics
ADD CONSTRAINT fk_daily_metrics_team_member
FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

ALTER TABLE public.check_ins
ADD CONSTRAINT fk_check_ins_team_member
FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

ALTER TABLE public.reminder_logs
ADD CONSTRAINT fk_reminder_logs_team_member
FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;
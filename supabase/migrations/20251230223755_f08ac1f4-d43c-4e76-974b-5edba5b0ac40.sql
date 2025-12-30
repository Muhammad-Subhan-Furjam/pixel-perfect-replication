-- Allow team members to view their own team_members record via auth_user_id
CREATE POLICY "Team members can view their own record"
ON public.team_members
FOR SELECT
USING (auth.uid() = auth_user_id);
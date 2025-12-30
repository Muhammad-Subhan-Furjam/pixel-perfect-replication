-- Add unique constraint on email column to prevent duplicate team members
ALTER TABLE public.team_members ADD CONSTRAINT team_members_email_unique UNIQUE (email);
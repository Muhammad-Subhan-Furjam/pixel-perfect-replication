-- Add email column to team_members table
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email text;
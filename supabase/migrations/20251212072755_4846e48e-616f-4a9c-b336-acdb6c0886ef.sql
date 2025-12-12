-- Add policy for CEO to manage user roles (insert, update, delete)
CREATE POLICY "CEO can manage user roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'ceo'))
WITH CHECK (has_role(auth.uid(), 'ceo'));

-- Add policy for CEO to view all profiles (needed to see other users)
CREATE POLICY "CEO can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'ceo'));

-- Add unique constraint on user_id to allow upsert by user_id
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
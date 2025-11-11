-- Create RLS policies for user_roles table

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Only admins can manage user roles
CREATE POLICY "Admins can manage user roles" 
  ON public.user_roles
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Policy: System can assign default roles (for new user creation)
CREATE POLICY "System can assign roles" 
  ON public.user_roles
  FOR INSERT 
  WITH CHECK (true);
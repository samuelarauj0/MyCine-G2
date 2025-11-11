-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

-- Update handle_new_user function to include role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username, display_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'display_name'
    );
    
    INSERT INTO public.user_xp (user_id, total_xp, level)
    VALUES (NEW.id, 0, 1);
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users with roles and profiles if they don't exist
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        -- Insert profile if doesn't exist
        INSERT INTO public.profiles (user_id, username, display_name)
        VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data->>'username', SPLIT_PART(user_record.email, '@', 1)),
            COALESCE(user_record.raw_user_meta_data->>'display_name', SPLIT_PART(user_record.email, '@', 1))
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Insert XP if doesn't exist
        INSERT INTO public.user_xp (user_id, total_xp, level)
        VALUES (user_record.id, 0, 1)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Insert default role if doesn't exist
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
END $$;

-- Promote specific email to admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get user ID for the admin email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'samuelaraujo220304@gmail.com';
    
    -- If user exists, promote to admin
    IF admin_user_id IS NOT NULL THEN
        -- Remove existing user role
        DELETE FROM public.user_roles 
        WHERE user_id = admin_user_id AND role = 'user';
        
        -- Add admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Update display name to Admin
        UPDATE public.profiles 
        SET display_name = 'Admin'
        WHERE user_id = admin_user_id;
    END IF;
END $$;
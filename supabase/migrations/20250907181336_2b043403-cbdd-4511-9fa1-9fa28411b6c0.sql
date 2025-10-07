-- Create admin user if it doesn't exist and promote to admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get user ID for the admin email (if exists)
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'samuelaraujo220304@gmail.com';
    
    -- If user exists, promote to admin
    IF admin_user_id IS NOT NULL THEN
        -- Remove existing user role if exists
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
        
        RAISE NOTICE 'User % promoted to admin', admin_user_id;
    ELSE
        RAISE NOTICE 'User with email samuelaraujo220304@gmail.com not found. Please sign up first.';
    END IF;
END $$;
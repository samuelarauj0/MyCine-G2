-- Update user role to admin for samuelaraujo220304@gmail.com
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'samuelaraujo220304@gmail.com'
);
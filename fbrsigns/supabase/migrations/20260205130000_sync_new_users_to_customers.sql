-- First, make full_name nullable if it has a NOT NULL constraint
ALTER TABLE public.customers ALTER COLUMN full_name DROP NOT NULL;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, user_id, email, full_name, phone_number, company_name)
  VALUES (
    new.id,
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: Update existing customers with their user_id if they match by email
UPDATE public.customers c
SET user_id = u.id,
    full_name = COALESCE(c.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    phone_number = COALESCE(c.phone_number, u.raw_user_meta_data->>'phone'),
    company_name = COALESCE(c.company_name, u.raw_user_meta_data->>'company')
FROM auth.users u
WHERE c.email = u.email 
  AND c.user_id IS NULL;

-- Backfill: Insert new customers for users that don't exist in customers table yet
INSERT INTO public.customers (id, user_id, email, full_name, phone_number, company_name)
SELECT 
  id,
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'phone',
  raw_user_meta_data->>'company'
FROM auth.users
WHERE email NOT IN (SELECT email FROM public.customers WHERE email IS NOT NULL);

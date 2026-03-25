-- ==========================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==========================================
-- Run this in Supabase SQL Editor to fix the RLS error on signup.
-- This automatically creates a user_profile when a user signs up.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role_id,
    hostel_id,
    room_number,
    dietary_preference
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role_id')::uuid, '44444444-4444-4444-4444-444444444444'::uuid), -- Default to student if null
    (NEW.raw_user_meta_data->>'hostel_id')::uuid,
    NEW.raw_user_meta_data->>'room_number',
    NEW.raw_user_meta_data->>'dietary_preference'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

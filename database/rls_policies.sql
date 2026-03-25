-- Row Level Security Policies for Supabase
-- Ensures users can only access data they're authorized to see

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT r.name INTO user_role
    FROM user_profiles up
    JOIN roles r ON up.role_id = r.id
    WHERE up.id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('super_admin', 'hostel_admin', 'mess_manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
CREATE POLICY "Admins can update any profile"
ON user_profiles FOR UPDATE
USING (is_admin());

DROP POLICY IF EXISTS "Allow insert during registration" ON user_profiles;
CREATE POLICY "Allow insert during registration"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- HOSTELS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view hostels" ON hostels;
CREATE POLICY "Anyone can view hostels"
ON hostels FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only super admins can manage hostels" ON hostels;
CREATE POLICY "Only super admins can manage hostels"
ON hostels FOR ALL
USING (is_super_admin());

-- ============================================
-- ROLES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
CREATE POLICY "Anyone can view roles"
ON roles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only super admins can manage roles" ON roles;
CREATE POLICY "Only super admins can manage roles"
ON roles FOR ALL
USING (is_super_admin());

-- ============================================
-- MEALS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view meals" ON meals;
CREATE POLICY "Anyone can view meals"
ON meals FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Mess managers can manage meals" ON meals;
CREATE POLICY "Mess managers can manage meals"
ON meals FOR ALL
USING (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- MEAL MENUS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view menus" ON meal_menus;
CREATE POLICY "Anyone can view menus"
ON meal_menus FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Mess managers can manage menus" ON meal_menus;
CREATE POLICY "Mess managers can manage menus"
ON meal_menus FOR ALL
USING (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- MEAL BOOKINGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own bookings" ON meal_bookings;
CREATE POLICY "Users can view their own bookings"
ON meal_bookings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bookings" ON meal_bookings;
CREATE POLICY "Admins can view all bookings"
ON meal_bookings FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Users can create their own bookings" ON meal_bookings;
CREATE POLICY "Users can create their own bookings"
ON meal_bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON meal_bookings;
CREATE POLICY "Users can update their own bookings"
ON meal_bookings FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any booking" ON meal_bookings;
CREATE POLICY "Admins can update any booking"
ON meal_bookings FOR UPDATE
USING (is_admin());

-- ============================================
-- BOOKING PREFERENCES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can manage their own preferences" ON booking_preferences;
CREATE POLICY "Users can manage their own preferences"
ON booking_preferences FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- INVENTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view inventory" ON inventory;
CREATE POLICY "Anyone can view inventory"
ON inventory FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Mess managers can manage inventory" ON inventory;
CREATE POLICY "Mess managers can manage inventory"
ON inventory FOR ALL
USING (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- INVENTORY CATEGORIES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view categories" ON inventory_categories;
CREATE POLICY "Anyone can view categories"
ON inventory_categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON inventory_categories;
CREATE POLICY "Admins can manage categories"
ON inventory_categories FOR ALL
USING (is_admin());

-- ============================================
-- INVENTORY HISTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view inventory history" ON inventory_history;
CREATE POLICY "Admins can view inventory history"
ON inventory_history FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Mess managers can log inventory changes" ON inventory_history;
CREATE POLICY "Mess managers can log inventory changes"
ON inventory_history FOR INSERT
WITH CHECK (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- OCCUPANCY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view occupancy" ON hostel_occupancy;
CREATE POLICY "Admins can view occupancy"
ON hostel_occupancy FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage occupancy" ON hostel_occupancy;
CREATE POLICY "Admins can manage occupancy"
ON hostel_occupancy FOR ALL
USING (is_admin());

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_records;
CREATE POLICY "Users can view their own attendance"
ON attendance_records FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance_records;
CREATE POLICY "Admins can view all attendance"
ON attendance_records FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Admins can record attendance" ON attendance_records;
CREATE POLICY "Admins can record attendance"
ON attendance_records FOR INSERT
WITH CHECK (is_admin());

-- ============================================
-- LEAVE CALENDAR POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can manage their own leave" ON leave_calendar;
CREATE POLICY "Users can manage their own leave"
ON leave_calendar FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all leave" ON leave_calendar;
CREATE POLICY "Admins can view all leave"
ON leave_calendar FOR SELECT
USING (is_admin());

-- ============================================
-- WASTAGE LOGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view wastage logs" ON wastage_logs;
CREATE POLICY "Admins can view wastage logs"
ON wastage_logs FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "Mess managers can log wastage" ON wastage_logs;
CREATE POLICY "Mess managers can log wastage"
ON wastage_logs FOR INSERT
WITH CHECK (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- WASTAGE GOALS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view wastage goals" ON wastage_goals;
CREATE POLICY "Anyone can view wastage goals"
ON wastage_goals FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admins can manage goals" ON wastage_goals;
CREATE POLICY "Super admins can manage goals"
ON wastage_goals FOR ALL
USING (is_super_admin());

-- ============================================
-- DONATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view available donations" ON donations;
CREATE POLICY "Anyone can view available donations"
ON donations FOR SELECT
USING (status = 'available' OR is_admin());

DROP POLICY IF EXISTS "Mess managers can create donations" ON donations;
CREATE POLICY "Mess managers can create donations"
ON donations FOR INSERT
WITH CHECK (get_user_role() IN ('mess_manager', 'super_admin'));

DROP POLICY IF EXISTS "Mess managers can update donations" ON donations;
CREATE POLICY "Mess managers can update donations"
ON donations FOR UPDATE
USING (get_user_role() IN ('mess_manager', 'super_admin'));

-- ============================================
-- DONATION RECIPIENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view verified recipients" ON donation_recipients;
CREATE POLICY "Anyone can view verified recipients"
ON donation_recipients FOR SELECT
USING (is_verified = true OR is_admin());

DROP POLICY IF EXISTS "Anyone can register as recipient" ON donation_recipients;
CREATE POLICY "Anyone can register as recipient"
ON donation_recipients FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can verify recipients" ON donation_recipients;
CREATE POLICY "Super admins can verify recipients"
ON donation_recipients FOR UPDATE
USING (is_super_admin());

-- ============================================
-- DONATION FEEDBACK POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view feedback" ON donation_feedback;
CREATE POLICY "Anyone can view feedback"
ON donation_feedback FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Recipients can submit feedback" ON donation_feedback;
CREATE POLICY "Recipients can submit feedback"
ON donation_feedback FOR INSERT
WITH CHECK (true);

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- ANALYTICS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view analytics" ON analytics_summary;
CREATE POLICY "Admins can view analytics"
ON analytics_summary FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "System can manage analytics" ON analytics_summary;
CREATE POLICY "System can manage analytics"
ON analytics_summary FOR ALL
USING (is_super_admin());

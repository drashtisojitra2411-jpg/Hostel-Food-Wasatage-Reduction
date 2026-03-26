-- Hostel Food Waste Reduction System
-- PostgreSQL Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUTHENTICATION & USER MANAGEMENT
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hostels table
CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    capacity INTEGER DEFAULT 0,
    warden_name VARCHAR(100),
    warden_contact VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (self-managed auth — no longer depends on Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role_id UUID REFERENCES roles(id),
    hostel_id UUID REFERENCES hostels(id),
    room_number VARCHAR(20),
    dietary_preference VARCHAR(50) DEFAULT 'vegetarian', -- vegetarian, non-vegetarian, vegan, eggetarian
    allergies TEXT[],
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    auto_booking_enabled BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEAL MANAGEMENT
-- ============================================

-- Meals master table
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_type VARCHAR(20) NOT NULL, -- breakfast, lunch, dinner, snacks
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booking_deadline TIMESTAMPTZ NOT NULL,
    cancellation_deadline TIMESTAMPTZ NOT NULL,
    max_capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meal_type, date)
);

-- Meal menus
CREATE TABLE IF NOT EXISTS meal_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- main, side, dessert, beverage
    dietary_type VARCHAR(50), -- vegetarian, non-vegetarian, vegan
    calories INTEGER,
    allergens TEXT[],
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal bookings
CREATE TABLE IF NOT EXISTS meal_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- pending, confirmed, cancelled, consumed, no_show
    is_auto_booked BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, meal_id)
);

-- Menu voting (one option per user per day+meal+week)
CREATE TABLE IF NOT EXISTS menu_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    day VARCHAR(20) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    selected_option VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, week_start, day, meal_type)
);

-- Booking preferences for auto-booking
CREATE TABLE IF NOT EXISTS booking_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL,
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday, NULL=all days
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, meal_type, day_of_week)
);

-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

-- Inventory categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#10B981', -- hex color for UI
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES inventory_categories(id),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL, -- kg, liters, pieces, packets
    unit_cost DECIMAL(10,2) DEFAULT 0,
    expiry_date DATE,
    reorder_level DECIMAL(10,2) DEFAULT 10,
    max_stock_level DECIMAL(10,2) DEFAULT 100,
    storage_location VARCHAR(100),
    supplier VARCHAR(100),
    supplier_contact VARCHAR(100),
    last_restocked_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock, expired
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory history for tracking changes
CREATE TABLE IF NOT EXISTS inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- restock, consume, adjust, expire
    quantity_change DECIMAL(10,2) NOT NULL,
    quantity_before DECIMAL(10,2) NOT NULL,
    quantity_after DECIMAL(10,2) NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OCCUPANCY & ATTENDANCE
-- ============================================

-- Hostel occupancy summary
CREATE TABLE IF NOT EXISTS hostel_occupancy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    expected_count INTEGER DEFAULT 0,
    booked_count INTEGER DEFAULT 0,
    actual_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hostel_id, date, meal_type)
);

-- Individual attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_in_method VARCHAR(20) DEFAULT 'manual', -- qr_code, id_card, manual, biometric
    verified_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave calendar for planned absences
CREATE TABLE IF NOT EXISTS leave_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    meal_types TEXT[] DEFAULT ARRAY['breakfast', 'lunch', 'dinner'],
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WASTAGE TRACKING
-- ============================================

-- Wastage logs
CREATE TABLE IF NOT EXISTS wastage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID REFERENCES meals(id),
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    food_category VARCHAR(50), -- rice, curry, vegetables, bread, dessert, beverages
    item_name VARCHAR(100),
    quantity_prepared DECIMAL(10,2),
    quantity_consumed DECIMAL(10,2),
    quantity_wasted DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    estimated_cost DECIMAL(10,2),
    reason VARCHAR(100), -- overproduction, spoilage, quality_issue, low_attendance
    notes TEXT,
    logged_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wastage reduction goals
CREATE TABLE IF NOT EXISTS wastage_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostel_id UUID REFERENCES hostels(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    target_reduction_percent DECIMAL(5,2) DEFAULT 10,
    baseline_wastage_kg DECIMAL(10,2),
    current_wastage_kg DECIMAL(10,2) DEFAULT 0,
    target_wastage_kg DECIMAL(10,2),
    is_achieved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hostel_id, month, year)
);

-- ============================================
-- DONATIONS
-- ============================================

-- Donation recipients (NGOs, charities)
CREATE TABLE IF NOT EXISTS donation_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    registration_number VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES user_profiles(id),
    rating DECIMAL(3,2) DEFAULT 0,
    total_donations_received INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID REFERENCES meals(id),
    recipient_id UUID REFERENCES donation_recipients(id),
    food_items JSONB NOT NULL, -- [{name, quantity, unit}]
    total_quantity_kg DECIMAL(10,2) NOT NULL,
    estimated_servings INTEGER,
    estimated_value DECIMAL(10,2),
    pickup_scheduled_at TIMESTAMPTZ,
    pickup_location TEXT,
    pickup_instructions TEXT,
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, scheduled, picked_up, completed, cancelled
    picked_up_at TIMESTAMPTZ,
    picked_up_by VARCHAR(100),
    photos TEXT[],
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation feedback
CREATE TABLE IF NOT EXISTS donation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES donation_recipients(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    feedback_text TEXT,
    people_served INTEGER,
    photos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- booking_confirmed, booking_reminder, low_stock, expiry_warning, donation_available, wastage_alert
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostel_id UUID REFERENCES hostels(id),
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- daily_wastage, weekly_summary, monthly_summary, sustainability_score
    metrics JSONB NOT NULL, -- flexible storage for various metrics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hostel_id, date, metric_type)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hostel ON user_profiles(hostel_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);

CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_meals_type_date ON meals(meal_type, date);

CREATE INDEX IF NOT EXISTS idx_meal_bookings_user ON meal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_meal ON meal_bookings(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_date ON meal_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_status ON meal_bookings(status);
CREATE INDEX IF NOT EXISTS idx_menu_votes_week_start ON menu_votes(week_start);
CREATE INDEX IF NOT EXISTS idx_menu_votes_day_meal ON menu_votes(day, meal_type);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);

CREATE INDEX IF NOT EXISTS idx_wastage_logs_date ON wastage_logs(date);
CREATE INDEX IF NOT EXISTS idx_wastage_logs_meal_type ON wastage_logs(meal_type);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_recipient ON donations(recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_analytics_hostel_date ON analytics_summary(hostel_id, date);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hostels_updated_at ON hostels;
CREATE TRIGGER update_hostels_updated_at BEFORE UPDATE ON hostels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_bookings_updated_at ON meal_bookings;
CREATE TRIGGER update_meal_bookings_updated_at BEFORE UPDATE ON meal_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hostel_occupancy_updated_at ON hostel_occupancy;
CREATE TRIGGER update_hostel_occupancy_updated_at BEFORE UPDATE ON hostel_occupancy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_calendar_updated_at ON leave_calendar;
CREATE TRIGGER update_leave_calendar_updated_at BEFORE UPDATE ON leave_calendar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wastage_goals_updated_at ON wastage_goals;
CREATE TRIGGER update_wastage_goals_updated_at BEFORE UPDATE ON wastage_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donation_recipients_updated_at ON donation_recipients;
CREATE TRIGGER update_donation_recipients_updated_at BEFORE UPDATE ON donation_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

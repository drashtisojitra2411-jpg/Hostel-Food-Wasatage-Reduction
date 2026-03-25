-- Feature migration: finalized menu voting, attendance rewards, QR attendance.
-- Run this once against your Neon/PostgreSQL database.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Voting table: one vote per user per meal, for a meal_menus option.
CREATE TABLE IF NOT EXISTS meal_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    meal_menu_id UUID NOT NULL REFERENCES meal_menus(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_votes_meal_id ON meal_votes(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_menu_id ON meal_votes(meal_menu_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_user_id ON meal_votes(user_id);

-- Reward summary per student.
CREATE TABLE IF NOT EXISTS student_rewards (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    total_meals INTEGER NOT NULL DEFAULT 0 CHECK (total_meals >= 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_rewards_points ON student_rewards(points DESC);

-- Attendance records with one scan per student per meal.
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qr_token_id UUID,
    UNIQUE(user_id, meal_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_scanned_at ON attendance(user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_meal_id ON attendance(meal_id);

-- Fee calculation helper: each 100 points gives 1% discount, capped at 25%.
CREATE OR REPLACE FUNCTION calculate_effective_meal_fee(base_fee NUMERIC, points INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    discount_percent INTEGER;
    discounted NUMERIC;
BEGIN
    discount_percent := LEAST(25, GREATEST(0, FLOOR(COALESCE(points, 0) / 100.0)));
    discounted := ROUND(COALESCE(base_fee, 0) * (1 - discount_percent / 100.0), 2);
    RETURN discounted;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

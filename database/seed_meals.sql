-- Seed Meals for the next 30 days
-- Run this in Supabase SQL Editor to populate the meal schedule

DO $$
DECLARE
    curr_date DATE := CURRENT_DATE;
    end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    meal_type_var VARCHAR;
BEGIN
    WHILE curr_date <= end_date LOOP
        -- Breakfast
        INSERT INTO meals (meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, max_capacity)
        VALUES (
            'breakfast',
            curr_date,
            '07:30:00',
            '09:30:00',
            (curr_date - INTERVAL '1 day' + INTERVAL '22 hours'), -- Deadline: 10 PM prev day
            (curr_date + INTERVAL '7 hours'), -- Cancel by 7 AM
            450
        ) ON CONFLICT (meal_type, date) DO NOTHING;

        -- Lunch
        INSERT INTO meals (meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, max_capacity)
        VALUES (
            'lunch',
            curr_date,
            '12:30:00',
            '14:30:00',
            (curr_date + INTERVAL '10 hours'), -- Deadline: 10 AM same day
            (curr_date + INTERVAL '11 hours'), -- Cancel by 11 AM
            450
        ) ON CONFLICT (meal_type, date) DO NOTHING;

        -- Dinner
        INSERT INTO meals (meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, max_capacity)
        VALUES (
            'dinner',
            curr_date,
            '19:30:00',
            '21:30:00',
            (curr_date + INTERVAL '17 hours'), -- Deadline: 5 PM same day
            (curr_date + INTERVAL '18 hours'), -- Cancel by 6 PM
            450
        ) ON CONFLICT (meal_type, date) DO NOTHING;

        curr_date := curr_date + 1;
    END LOOP;
END $$;

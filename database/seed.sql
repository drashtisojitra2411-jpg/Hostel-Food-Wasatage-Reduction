-- Seed Data for Hostel Food Waste Reduction System

-- ============================================
-- ROLES
-- ============================================

INSERT INTO roles (id, name, description, permissions) VALUES
    ('11111111-1111-1111-1111-111111111111', 'super_admin', 'Full system access', '{"all": true}'),
    ('22222222-2222-2222-2222-222222222222', 'hostel_admin', 'Manage hostel operations', '{"manage_hostel": true, "view_reports": true}'),
    ('33333333-3333-3333-3333-333333333333', 'mess_manager', 'Manage mess operations', '{"manage_inventory": true, "manage_meals": true, "log_wastage": true}'),
    ('44444444-4444-4444-4444-444444444444', 'student', 'Book meals and view personal data', '{"book_meals": true, "view_own_data": true}'),
    ('55555555-5555-5555-5555-555555555555', 'chef', 'Manage daily food prep and log wastage', '{"view_menu": true, "log_wastage": true, "view_inventory": true}'),
    ('66666666-6666-6666-6666-666666666666', 'ngo', 'View and claim food donations', '{"view_donations": true, "claim_donations": true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HOSTELS
-- ============================================

INSERT INTO hostels (id, name, code, address, capacity, warden_name, warden_contact) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 'Hostel A - North Block', 'HST-A', 'North Campus, Building A', 250, 'Dr. Sharma', '+91-9876543210'),
    ('aaaa2222-2222-2222-2222-222222222222', 'Hostel B - South Block', 'HST-B', 'South Campus, Building B', 300, 'Dr. Patel', '+91-9876543211'),
    ('aaaa3333-3333-3333-3333-333333333333', 'Hostel C - East Wing', 'HST-C', 'East Campus, Building C', 200, 'Dr. Kumar', '+91-9876543212'),
    ('aaaa4444-4444-4444-4444-444444444444', 'Hostel D - West Wing', 'HST-D', 'West Campus, Building D', 180, 'Dr. Singh', '+91-9876543213')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INVENTORY CATEGORIES
-- ============================================

INSERT INTO inventory_categories (id, name, description, color, icon) VALUES
    ('cccc1111-1111-1111-1111-111111111111', 'Grains & Cereals', 'Rice, wheat, oats, etc.', '#F59E0B', 'grain'),
    ('cccc2222-2222-2222-2222-222222222222', 'Vegetables', 'Fresh vegetables', '#10B981', 'carrot'),
    ('cccc3333-3333-3333-3333-333333333333', 'Fruits', 'Fresh fruits', '#EF4444', 'apple'),
    ('cccc4444-4444-4444-4444-444444444444', 'Dairy', 'Milk, curd, paneer, etc.', '#3B82F6', 'milk'),
    ('cccc5555-5555-5555-5555-555555555555', 'Spices & Condiments', 'Spices and seasonings', '#8B5CF6', 'pepper'),
    ('cccc6666-6666-6666-6666-666666666666', 'Pulses & Legumes', 'Dal, beans, lentils', '#EC4899', 'bean'),
    ('cccc7777-7777-7777-7777-777777777777', 'Oils & Fats', 'Cooking oils, ghee', '#F97316', 'droplet'),
    ('cccc8888-8888-8888-8888-888888888888', 'Beverages', 'Tea, coffee, juices', '#14B8A6', 'coffee')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE INVENTORY ITEMS
-- ============================================

INSERT INTO inventory (item_name, category_id, quantity, unit, unit_cost, expiry_date, reorder_level, storage_location, supplier, status) VALUES
    ('Basmati Rice', 'cccc1111-1111-1111-1111-111111111111', 500, 'kg', 65.00, '2026-06-15', 100, 'Dry Store - Rack A1', 'ABC Traders', 'in_stock'),
    ('Wheat Flour (Atta)', 'cccc1111-1111-1111-1111-111111111111', 300, 'kg', 45.00, '2026-04-20', 75, 'Dry Store - Rack A2', 'ABC Traders', 'in_stock'),
    ('Potatoes', 'cccc2222-2222-2222-2222-222222222222', 80, 'kg', 30.00, '2026-02-10', 50, 'Cold Store - Section V1', 'Fresh Farms', 'in_stock'),
    ('Onions', 'cccc2222-2222-2222-2222-222222222222', 120, 'kg', 35.00, '2026-02-15', 60, 'Dry Store - Rack V1', 'Fresh Farms', 'in_stock'),
    ('Tomatoes', 'cccc2222-2222-2222-2222-222222222222', 40, 'kg', 40.00, '2026-01-25', 30, 'Cold Store - Section V2', 'Fresh Farms', 'in_stock'),
    ('Milk', 'cccc4444-4444-4444-4444-444444444444', 100, 'liters', 55.00, '2026-01-20', 50, 'Cold Store - Dairy', 'Mother Dairy', 'in_stock'),
    ('Curd', 'cccc4444-4444-4444-4444-444444444444', 30, 'kg', 60.00, '2026-01-22', 20, 'Cold Store - Dairy', 'Mother Dairy', 'in_stock'),
    ('Toor Dal', 'cccc6666-6666-6666-6666-666666666666', 100, 'kg', 120.00, '2026-08-30', 40, 'Dry Store - Rack P1', 'Pulses India', 'in_stock'),
    ('Cooking Oil', 'cccc7777-7777-7777-7777-777777777777', 80, 'liters', 150.00, '2026-12-01', 30, 'Dry Store - Rack O1', 'Fortune', 'in_stock'),
    ('Tea Powder', 'cccc8888-8888-8888-8888-888888888888', 25, 'kg', 400.00, '2026-09-15', 10, 'Dry Store - Rack B1', 'Tata Tea', 'in_stock')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DONATION RECIPIENTS
-- ============================================

INSERT INTO donation_recipients (organization_name, contact_person, email, phone, address, city, registration_number, is_verified) VALUES
    ('Food For All Foundation', 'Rahul Verma', 'contact@foodforall.org', '+91-9876500001', '45 MG Road', 'Delhi', 'NGO-2020-1234', true),
    ('Annapoorna Trust', 'Priya Sharma', 'info@annapoorna.org', '+91-9876500002', '23 Gandhi Nagar', 'Delhi', 'NGO-2019-5678', true),
    ('Hunger Relief India', 'Amit Kumar', 'help@hungerrelief.in', '+91-9876500003', '78 Nehru Place', 'Delhi', 'NGO-2021-9012', true),
    ('Community Kitchen', 'Sunita Devi', 'kitchen@community.org', '+91-9876500004', '12 Lajpat Nagar', 'Delhi', 'NGO-2018-3456', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE WASTAGE GOALS
-- ============================================

INSERT INTO wastage_goals (hostel_id, month, year, target_reduction_percent, baseline_wastage_kg, target_wastage_kg) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', 1, 2026, 15, 450, 382.5),
    ('aaaa1111-1111-1111-1111-111111111111', 2, 2026, 20, 450, 360),
    ('aaaa2222-2222-2222-2222-222222222222', 1, 2026, 15, 520, 442),
    ('aaaa3333-3333-3333-3333-333333333333', 1, 2026, 10, 350, 315)
ON CONFLICT (hostel_id, month, year) DO NOTHING;

-- ============================================
-- DEMO USER PROFILES (password is 'password123')
-- ============================================

INSERT INTO user_profiles (id, email, password_hash, full_name, role_id, hostel_id, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'chef@test.com', '$2a$12$PrfiwnC3BqiV.JilSUqAtO0IqCPmeN6YTZ9d6DHO0/KGk1GmaPRk2', 'Gordon Ramsay', '55555555-5555-5555-5555-555555555555', 'aaaa1111-1111-1111-1111-111111111111', true),
    ('20000000-0000-0000-0000-000000000002', 'ngo@test.com', '$2a$12$PrfiwnC3BqiV.JilSUqAtO0IqCPmeN6YTZ9d6DHO0/KGk1GmaPRk2', 'Food For All NGO', '66666666-6666-6666-6666-666666666666', NULL, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- HISTORICAL WASTAGE LOGS (For AI Prediction Graph)
-- ============================================

INSERT INTO wastage_logs (date, meal_type, quantity_prepared, quantity_consumed, quantity_wasted, logged_by) VALUES
    (CURRENT_DATE - INTERVAL '1 day', 'breakfast', 120, 100, 20, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '1 day', 'lunch', 150, 130, 20, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '1 day', 'dinner', 140, 125, 15, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '2 days', 'breakfast', 120, 90, 30, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '2 days', 'lunch', 150, 140, 10, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '2 days', 'dinner', 140, 130, 10, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '3 days', 'breakfast', 120, 110, 10, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '3 days', 'lunch', 150, 110, 40, '10000000-0000-0000-0000-000000000001'),
    (CURRENT_DATE - INTERVAL '3 days', 'dinner', 140, 100, 40, '10000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONATION HISTORY
-- ============================================

INSERT INTO donations (recipient_id, food_items, total_quantity_kg, estimated_servings, status, created_by, created_at) VALUES
    ((SELECT id FROM donation_recipients LIMIT 1), '[{"name": "Rice", "quantity": 10, "unit": "kg"}, {"name": "Dal", "quantity": 5, "unit": "kg"}]', 15, 50, 'completed', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day'),
    ((SELECT id FROM donation_recipients LIMIT 1), '[{"name": "Roti", "quantity": 5, "unit": "kg"}, {"name": "Mixed Veg", "quantity": 8, "unit": "kg"}]', 13, 40, 'completed', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days'),
    ((SELECT id FROM donation_recipients LIMIT 1), '[{"name": "Pulao", "quantity": 15, "unit": "kg"}]', 15, 60, 'completed', '10000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days'),
    ((SELECT id FROM donation_recipients LIMIT 1), '[{"name": "Idli Sambar", "quantity": 12, "unit": "kg"}]', 12, 45, 'available', '10000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT DO NOTHING;

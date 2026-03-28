import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    MEAL_ORDER,
    getMealTimingForType,
    normalizeMealTimingType,
    toDbTime
} from '../shared/mealTimings.js';
import {
    ATTENDANCE_QR_EXPECTED_FORMAT,
    buildAttendanceQrPayload,
    parseAttendanceQrPayload
} from '../shared/attendanceQr.js';
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log("DATABASE_URL:", process.env.DATABASE_URL);
const app = express();

const allowedOrigins = [
    'http://localhost:5174',
    'https://zerobite-two.vercel.app', // main domain
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app')
        ) {
            return callback(null, true);
        }

        return callback(new Error('CORS not allowed'));
    },
    credentials: true
}));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// ─── Database Connection ────────────────────────────────────────────────────
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

const MENU_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MENU_MEALS = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_MEAL_BASE_FEE = 120;
const DEFAULT_MENU_OPTIONS = {
    Monday: {
        breakfast: ['Poha', 'Upma', 'Sandwich', 'Idli Sambar'],
        lunch: ['Dal Rice', 'Paneer Roti', 'Rajma Rice', 'Veg Pulao'],
        dinner: ['Khichdi', 'Chapati Sabji', 'Pulao', 'Curd Rice']
    },
    Tuesday: {
        breakfast: ['Aloo Paratha', 'Dosa', 'Bread Omelette', 'Pongal'],
        lunch: ['Chole Rice', 'Mix Veg Roti', 'Sambar Rice', 'Jeera Rice'],
        dinner: ['Veg Noodles', 'Dal Khichdi', 'Roti Curry', 'Lemon Rice']
    },
    Wednesday: {
        breakfast: ['Masala Dosa', 'Puri Bhaji', 'Corn Sandwich', 'Sev Upma'],
        lunch: ['Kadhi Chawal', 'Paneer Bhurji Roti', 'Veg Biryani', 'Curd Rice'],
        dinner: ['Fried Rice', 'Chapati Dal', 'Veg Pulao', 'Tomato Rice']
    },
    Thursday: {
        breakfast: ['Idli', 'Poha', 'Besan Chilla', 'Veg Sandwich'],
        lunch: ['Rajma Rice', 'Aloo Gobi Roti', 'Dal Tadka Rice', 'Veg Khichdi'],
        dinner: ['Pulao', 'Chapati Paneer', 'Lemon Rice', 'Veg Noodles']
    },
    Friday: {
        breakfast: ['Uttapam', 'Paratha', 'Dhokla', 'Bread Butter'],
        lunch: ['Soya Curry Roti', 'Dal Fry Rice', 'Paneer Rice Bowl', 'Curd Rice'],
        dinner: ['Khichdi', 'Roti Sabji', 'Peas Pulao', 'Sambar Rice']
    },
    Saturday: {
        breakfast: ['Poori', 'Medu Vada', 'Poha', 'Sprouts Salad'],
        lunch: ['Veg Biryani', 'Dal Rice', 'Paneer Roti', 'Kadhi Rice'],
        dinner: ['Pasta', 'Chapati Curry', 'Jeera Rice', 'Khichdi']
    },
    Sunday: {
        breakfast: ['Chole Bhature', 'Masala Oats', 'Dosa', 'Sandwich'],
        lunch: ['Special Thali', 'Paneer Butter Masala Roti', 'Pulao Raita', 'Dal Makhani Rice'],
        dinner: ['Special Meal', 'Veg Fried Rice', 'Chapati Paneer', 'Khichdi']
    }
};

function getWeekStartISO(input = new Date()) {
    const current = new Date(input);
    const day = current.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + offset);
    current.setHours(0, 0, 0, 0);
    return current.toISOString().split('T')[0];
}

function normalizeDay(day) {
    const value = String(day || '').trim().toLowerCase();
    return MENU_DAYS.find((d) => d.toLowerCase() === value) || '';
}

function normalizeMealType(mealType) {
    const value = normalizeMealTimingType(mealType);
    return MENU_MEALS.includes(value) ? value : '';
}

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

// ─── IST Timezone Helpers ───────────────────────────────────────────────────
const IST_TIMEZONE = 'Asia/Kolkata';

function getISTNow() {
    const now = new Date();
    const istStr = now.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const istDate = new Date(istStr);
    return {
        date: istDate,
        hours: istDate.getHours(),
        minutes: istDate.getMinutes(),
        timeString: istDate.toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }),
        dateString: istDate.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE }), // YYYY-MM-DD
    };
}

function timeToMinutes(timeStr) {
    const [h, m] = String(timeStr || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function isWithinMealTime(startTime, endTime) {
    const ist = getISTNow();
    const currentMinutes = ist.hours * 60 + ist.minutes;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // Handle midnight crossover (e.g., 22:00 - 01:00)
    let within;
    if (endMinutes < startMinutes) {
        within = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
        within = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return {
        within,
        currentTime: ist.timeString,
        startTime: String(startTime || '').slice(0, 5),
        endTime: String(endTime || '').slice(0, 5),
    };
}

function formatTime12h(timeStr) {
    const [h, m] = String(timeStr || '').split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

async function ensureMenuVotingTable() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS menu_votes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            week_start DATE NOT NULL,
            day VARCHAR(20) NOT NULL,
            meal_type VARCHAR(20) NOT NULL,
            selected_option VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, week_start, day, meal_type)
        )`
    );

    await pool.query('CREATE INDEX IF NOT EXISTS idx_menu_votes_week_start ON menu_votes(week_start)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_menu_votes_day_meal ON menu_votes(day, meal_type)');
}

async function ensureAttendanceTables() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS student_rewards (
            user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
            points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
            total_meals INTEGER NOT NULL DEFAULT 0 CHECK (total_meals >= 0),
            last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
            scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            qr_token_id TEXT,
            UNIQUE(user_id, meal_id)
        )`
    );

    // meal_timings table — stores allowed time windows for each meal (IST)
    await pool.query(
        `CREATE TABLE IF NOT EXISTS meal_timings (
            id SERIAL PRIMARY KEY,
            meal_name VARCHAR(20) UNIQUE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL
        )`
    );

    // Keep DB in sync with canonical shared timings
    for (const mealName of MEAL_ORDER) {
        const timing = getMealTimingForType(mealName);
        if (!timing) continue;

        await pool.query(
            `INSERT INTO meal_timings (meal_name, start_time, end_time)
             VALUES ($1, $2, $3)
             ON CONFLICT (meal_name)
             DO UPDATE SET
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time`,
            [mealName, timing.start, timing.end]
        );
    }
    console.log('[MealTimings] Canonical timings synced');
}

// Test DB connection on startup
pool.query('SELECT NOW()')
    .then(async () => {
        await ensureMenuVotingTable();
        await ensureAttendanceTables();
        console.log('✅ Database connected');
    })
    .catch(err => console.error('❌ Database connection failed:', err.message));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend is running');
});

// Auth middleware — extracts user from JWT
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { ...decoded, role: normalizeRole(decoded?.role) };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Optional auth — sets req.user if token present, but doesn't block
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
            req.user = { ...decoded, role: normalizeRole(decoded?.role) };
        } catch { /* ignore */ }
    }
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.user || normalizeRole(req.user.role) !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
}

function requireRole(roles = []) {
    const allowed = new Set(roles.map((role) => normalizeRole(role)));
    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role);
        if (!req.user || !allowed.has(userRole)) {
            return res.status(403).json({ error: 'Insufficient role permissions' });
        }
        next();
    };
}

async function fetchOverviewMetrics() {
    const [
        usersRes,
        hostelsRes,
        chefsRes,
        ngosRes,
        bookingsTodayRes,
        wastageTodayRes,
        donatedTodayRes
    ] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total_users FROM user_profiles WHERE is_active = true"),
        pool.query("SELECT COUNT(*)::int AS total_hostels FROM hostels WHERE is_active = true"),
        pool.query(
            "SELECT COUNT(*)::int AS active_chefs " +
            "FROM user_profiles up " +
            "JOIN roles r ON up.role_id = r.id " +
            "WHERE up.is_active = true AND LOWER(r.name) = 'chef'"
        ),
        pool.query(
            "SELECT COUNT(*)::int AS registered_ngos " +
            "FROM user_profiles up " +
            "JOIN roles r ON up.role_id = r.id " +
            "WHERE up.is_active = true AND LOWER(r.name) = 'ngo'"
        ),
        pool.query("SELECT COUNT(*)::int AS meals_served_today FROM meal_bookings WHERE booking_date = CURRENT_DATE AND status = 'confirmed'"),
        pool.query("SELECT ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS food_wasted_today FROM wastage_logs WHERE date = CURRENT_DATE"),
        pool.query("SELECT ROUND(COALESCE(SUM(total_quantity_kg), 0)::numeric, 2)::float AS food_donated_today FROM donations WHERE DATE(created_at) = CURRENT_DATE")
    ]);

    return {
        total_users: usersRes.rows[0]?.total_users || 0,
        total_hostels: hostelsRes.rows[0]?.total_hostels || 0,
        active_chefs: chefsRes.rows[0]?.active_chefs || 0,
        registered_ngos: ngosRes.rows[0]?.registered_ngos || 0,
        meals_served_today: bookingsTodayRes.rows[0]?.meals_served_today || 0,
        food_wasted_today: wastageTodayRes.rows[0]?.food_wasted_today || 0,
        food_donated_today: donatedTodayRes.rows[0]?.food_donated_today || 0
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName, hostelId, roomNumber, dietaryPreference } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        // Check if email already exists
        const existing = await pool.query('SELECT id FROM user_profiles WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Default student role
        const roleId = '44444444-4444-4444-4444-444444444444';

        // Insert user profile
        const result = await pool.query(
            `INSERT INTO user_profiles (id, email, full_name, password_hash, role_id, hostel_id, room_number, dietary_preference)
             VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, full_name`,
            [email, fullName, passwordHash, roleId, hostelId || null, roomNumber || null, dietaryPreference || 'vegetarian']
        );

        res.status(201).json({ message: 'Registration successful', user: result.rows[0] });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

async function loginHandler(req, res) {
    try {
        const { email, password } = req.body || {};
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const inputPassword = String(password || '');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!normalizedEmail || !inputPassword) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        if (inputPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        let result;
        try {
            result = await pool.query(
                `SELECT up.*, r.name as role_name, r.permissions,
                        h.name as hostel_name, h.code as hostel_code
                 FROM user_profiles up
                 LEFT JOIN roles r ON up.role_id = r.id
                 LEFT JOIN hostels h ON up.hostel_id = h.id
                 WHERE LOWER(up.email) = $1`,
                [normalizedEmail]
            );
        } catch (dbError) {
            console.error('Login DB query failed:', dbError);
            return res.status(500).json({ error: 'Database connection error' });
        }

        if (!result || !Array.isArray(result.rows) || result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        if (!user || !user.password_hash || typeof user.password_hash !== 'string') {
            console.error('Login failed: password hash missing or invalid for user', {
                userId: user?.id || null,
                email: normalizedEmail
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        let validPassword = false;
        try {
            validPassword = await bcrypt.compare(inputPassword, user.password_hash);
        } catch (compareError) {
            console.error('bcrypt.compare failed during login:', compareError);
            return res.status(500).json({ error: 'Authentication failed' });
        }

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not set. Login token cannot be generated.');
            return res.status(500).json({ error: 'Authentication service unavailable' });
        }

        const resolvedRole = normalizeRole(user.role_name) || 'student';

        let token;
        try {
            token = jwt.sign(
                { id: user.id, email: user.email, role: resolvedRole },
                jwtSecret,
                { expiresIn: '7d' }
            );
        } catch (tokenError) {
            console.error('JWT token generation failed:', tokenError);
            return res.status(500).json({ error: 'Authentication token generation failed' });
        }

        const responseUser = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: resolvedRole,
            hostel_id: user.hostel_id || null
        };
        const { password_hash, ...profile } = user;
        profile.roles = { id: user.role_id, name: resolvedRole, permissions: user.permissions };
        profile.hostels = user.hostel_id ? { id: user.hostel_id, name: user.hostel_name, code: user.hostel_code } : null;

        return res.status(200).json({
            success: true,
            token,
            user: responseUser,
            profile
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/login
app.post('/api/login', loginHandler);

// Backward-compatible route
app.post('/api/auth/login', loginHandler);

// GET /api/auth/me — validate token and return current user + profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT up.*, r.name as role_name, r.permissions, r.id as r_id,
                    h.name as hostel_name, h.code as hostel_code
             FROM user_profiles up
             LEFT JOIN roles r ON up.role_id = r.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE up.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const { password_hash, ...profile } = user;
        profile.roles = { id: user.r_id, name: normalizeRole(user.role_name), permissions: user.permissions };
        profile.hostels = user.hostel_id ? { id: user.hostel_id, name: user.hostel_name, code: user.hostel_code } : null;

        res.json({
            user: { id: user.id, email: user.email },
            profile
        });
    } catch (error) {
        console.error('Auth/me error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/auth/reset-password (simplified — logs reset; full email flow not implemented)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query('SELECT id FROM user_profiles WHERE email = $1', [email]);
        // Always return success to prevent email enumeration
        console.log(`Password reset requested for: ${email} (found: ${result.rows.length > 0})`);
        res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// PUT /api/auth/update-password
app.put('/api/auth/update-password', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const hash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE user_profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
        res.json({ message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/profile
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT up.*, r.name as role_name, r.permissions, r.id as r_id,
                    h.name as hostel_name, h.code as hostel_code
             FROM user_profiles up
             LEFT JOIN roles r ON up.role_id = r.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE up.id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

        const user = result.rows[0];
        const { password_hash, ...profile } = user;
        profile.roles = { id: user.r_id, name: normalizeRole(user.role_name), permissions: user.permissions };
        profile.hostels = user.hostel_id ? { id: user.hostel_id, name: user.hostel_name, code: user.hostel_code } : null;

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/profile
app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const allowedFields = ['full_name', 'phone', 'room_number', 'dietary_preference', 'auto_booking_enabled', 'notification_preferences'];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${paramIndex}`);
                values.push(req.body[field]);
                paramIndex++;
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        values.push(req.user.id);
        await pool.query(
            `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
            values
        );

        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// HOSTELS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/hostels
app.get('/api/hostels', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, code FROM hostels WHERE is_active = true ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostels' });
    }
});

// GET /api/admin/users?role=chef - Fetch admin-manageable users by role
app.get('/api/admin/users', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const roleName = (req.query.role || '').toString().trim().toLowerCase();

        let query =
            "SELECT up.id, up.full_name AS name, up.email, up.is_active, up.hostel_id, " +
            "COALESCE(h.name, 'Unassigned') AS hostel_name, r.name AS role " +
            "FROM user_profiles up " +
            "LEFT JOIN roles r ON up.role_id = r.id " +
            "LEFT JOIN hostels h ON up.hostel_id = h.id ";
        const params = [];

        if (roleName) {
            query += "WHERE LOWER(r.name) = $1 ";
            params.push(roleName);
        }

        query += "ORDER BY up.created_at DESC";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/admin/users - Create personnel user
app.post('/api/admin/users', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { full_name, email, password, role, hostel_id } = req.body;
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ error: 'full_name, email, password and role are required' });
        }

        const roleRes = await pool.query("SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1", [role]);
        if (roleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const existing = await pool.query('SELECT id FROM user_profiles WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            "INSERT INTO user_profiles (id, email, password_hash, full_name, role_id, hostel_id, is_active) " +
            "VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true) " +
            "RETURNING id, full_name AS name, email, is_active, hostel_id",
            [email, passwordHash, full_name, roleRes.rows[0].id, hostel_id || null]
        );

        res.status(201).json({ message: 'User created', user: result.rows[0] });
    } catch (error) {
        console.error('Admin create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id - Update personnel user
app.put('/api/admin/users/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, hostel_id, is_active } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${idx++}`);
            values.push(full_name);
        }

        if (hostel_id !== undefined) {
            updates.push(`hostel_id = $${idx++}`);
            values.push(hostel_id || null);
        }

        if (is_active !== undefined) {
            updates.push(`is_active = $${idx++}`);
            values.push(Boolean(is_active));
        }

        if (role !== undefined) {
            const roleRes = await pool.query("SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1", [role]);
            if (roleRes.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            updates.push(`role_id = $${idx++}`);
            values.push(roleRes.rows[0].id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated' });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id - Soft delete (disable) personnel user
app.delete('/api/admin/users/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE user_profiles SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User disabled' });
    } catch (error) {
        console.error('Admin disable user error:', error);
        res.status(500).json({ error: 'Failed to disable user' });
    }
});

// GET /api/admin/hostels - Detailed hostel list for super admin entities module
app.get('/api/admin/hostels', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT h.id, h.name, h.code, h.address AS location, h.capacity, h.is_active, " +
            "COALESCE((" +
            "   SELECT COUNT(*)::int FROM meal_bookings mb " +
            "   JOIN meals m ON m.id = mb.meal_id " +
            "   WHERE mb.status = 'confirmed' AND m.date = CURRENT_DATE " +
            "     AND EXISTS (SELECT 1 FROM user_profiles u WHERE u.id = mb.user_id AND u.hostel_id = h.id)" +
            "), 0) AS meals_served_today, " +
            "COALESCE((" +
            "   SELECT ROUND((SUM(wl.quantity_wasted) / NULLIF(SUM(wl.quantity_prepared), 0)) * 100, 1) " +
            "   FROM wastage_logs wl " +
            "   JOIN user_profiles up2 ON up2.id = wl.logged_by " +
            "   WHERE wl.date = CURRENT_DATE AND up2.hostel_id = h.id" +
            "), 0) AS waste_pct, " +
            "COALESCE((" +
            "   SELECT up.full_name FROM user_profiles up " +
            "   JOIN roles r ON up.role_id = r.id " +
            "   WHERE up.hostel_id = h.id AND LOWER(r.name) = 'chef' " +
            "   ORDER BY up.updated_at DESC NULLS LAST LIMIT 1" +
            "), 'Unassigned') AS assigned_chef " +
            "FROM hostels h " +
            "ORDER BY h.name ASC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Admin hostels error:', error);
        res.status(500).json({ error: 'Failed to fetch admin hostels' });
    }
});

// POST /api/admin/hostels - Add new hostel
app.post('/api/admin/hostels', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { name, code, capacity, location } = req.body;

        if (!name || !code) {
            return res.status(400).json({ error: 'Hostel name and code are required' });
        }

        const result = await pool.query(
            "INSERT INTO hostels (name, code, capacity, address, is_active) " +
            "VALUES ($1, $2, $3, $4, true) " +
            "RETURNING id, name, code, capacity, address AS location, is_active",
            [name, code, Number(capacity) || 0, location || null]
        );

        res.status(201).json({ message: 'Hostel created successfully', hostel: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Hostel code already exists' });
        }
        console.error('Admin create hostel error:', error);
        res.status(500).json({ error: 'Failed to create hostel' });
    }
});

// PUT /api/admin/hostels/:id/capacity - Update hostel capacity
app.put('/api/admin/hostels/:id/capacity', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { capacity } = req.body;
        const parsedCapacity = Number(capacity);

        if (!Number.isFinite(parsedCapacity) || parsedCapacity < 0) {
            return res.status(400).json({ error: 'Valid capacity is required' });
        }

        const result = await pool.query(
            "UPDATE hostels SET capacity = $1, updated_at = NOW() WHERE id = $2 " +
            "RETURNING id, name, code, capacity, address AS location",
            [parsedCapacity, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hostel not found' });
        }

        res.json({ message: 'Hostel capacity updated successfully', hostel: result.rows[0] });
    } catch (error) {
        console.error('Admin update hostel capacity error:', error);
        res.status(500).json({ error: 'Failed to update hostel capacity' });
    }
});

// PUT /api/admin/assign-chef - Assign chef to hostel
app.put('/api/admin/assign-chef', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { chefId, hostelId } = req.body;

        if (!chefId || !hostelId) {
            return res.status(400).json({ error: 'chefId and hostelId are required' });
        }

        const chefRoleCheck = await pool.query(
            "SELECT up.id FROM user_profiles up " +
            "JOIN roles r ON up.role_id = r.id " +
            "WHERE up.id = $1 AND LOWER(r.name) = 'chef'",
            [chefId]
        );

        if (chefRoleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Chef not found' });
        }

        const hostelCheck = await pool.query("SELECT id FROM hostels WHERE id = $1", [hostelId]);
        if (hostelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Hostel not found' });
        }

        await pool.query(
            "UPDATE user_profiles SET hostel_id = $1, updated_at = NOW() WHERE id = $2",
            [hostelId, chefId]
        );

        res.json({ message: 'Chef assigned to hostel successfully' });
    } catch (error) {
        console.error('Admin assign chef error:', error);
        res.status(500).json({ error: 'Failed to assign chef to hostel' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// MEALS & BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/meals?date=YYYY-MM-DD
app.get('/api/meals', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date parameter required' });

        const result = await pool.query('SELECT * FROM meals WHERE date = $1', [date]);
        const rows = result.rows.map((meal) => {
            const mealType = normalizeMealType(meal.meal_type);
            const timing = getMealTimingForType(mealType);
            if (!timing) return meal;

            return {
                ...meal,
                start_time: toDbTime(timing.start),
                end_time: toDbTime(timing.end)
            };
        });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch meals' });
    }
});

// GET /api/meal-timings/current — Returns all meal windows and which is currently active (IST)
app.get('/api/meal-timings/current', async (req, res) => {
    try {
        const ist = getISTNow();

        let activeMeal = null;
        let nextMeal = null;
        const currentMinutes = ist.hours * 60 + ist.minutes;

        const meals = MEAL_ORDER.map((mealName) => {
            const timing = getMealTimingForType(mealName);
            const startStr = timing?.start || '';
            const endStr = timing?.end || '';
            const check = isWithinMealTime(startStr, endStr);
            const entry = {
                meal_name: mealName,
                start_time: startStr,
                end_time: endStr,
                start_time_display: formatTime12h(startStr),
                end_time_display: formatTime12h(endStr),
                is_active: check.within,
            };
            if (check.within && !activeMeal) {
                activeMeal = entry;
            }
            return entry;
        });

        // Find next upcoming meal if none is active
        if (!activeMeal) {
            for (const m of meals) {
                const mealStart = timeToMinutes(m.start_time);
                if (mealStart > currentMinutes) {
                    nextMeal = m;
                    break;
                }
            }
            // If no meal is later today, next meal is the first one tomorrow
            if (!nextMeal && meals.length > 0) {
                nextMeal = { ...meals[0], is_tomorrow: true };
            }
        }

        res.json({
            current_time_ist: ist.timeString,
            current_date_ist: ist.dateString,
            active_meal: activeMeal,
            next_meal: nextMeal,
            all_timings: meals,
        });
    } catch (error) {
        console.error('Meal timings error:', error);
        res.status(500).json({ error: 'Failed to fetch meal timings' });
    }
});

// GET /api/generate-qr/:mealId - Generate attendance QR (mess manager / hostel admin only)
app.get('/api/generate-qr/:mealId', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const mealId = String(req.params.mealId || '').trim();
        if (!mealId) {
            return res.status(400).json({ error: 'mealId is required' });
        }

        const mealRes = await pool.query(
            "SELECT id, meal_type, date, start_time, end_time FROM meals WHERE id = $1",
            [mealId]
        );
        if (mealRes.rows.length === 0) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        const meal = mealRes.rows[0];
        const mealType = normalizeMealType(meal.meal_type);

        const canonicalTiming = getMealTimingForType(mealType);
        const displayStart = canonicalTiming?.start || String(meal.start_time || '').slice(0, 5);
        const displayEnd = canonicalTiming?.end || String(meal.end_time || '').slice(0, 5);

        const qrPayload = buildAttendanceQrPayload(mealType);
        const qrImage = await QRCode.toDataURL(qrPayload, { width: 512, margin: 2 });

        console.log(`[QR] Generated for ${mealType} (${meal.id}) with payload ${qrPayload}`);

        return res.json({
            meal_id: meal.id,
            meal_type: mealType,
            qr_image: qrImage,
            timing: {
                start: displayStart,
                end: displayEnd,
                start_display: formatTime12h(displayStart),
                end_display: formatTime12h(displayEnd),
            }
        });
    } catch (error) {
        console.error('Generate QR error:', error);
        return res.status(500).json({ error: 'Failed to generate QR' });
    }
});

// POST /api/attendance - Scan and mark attendance (student only)
app.post('/api/attendance', authMiddleware, requireRole(['student']), async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const body = req.body || {};
        console.log('[Attendance] QR data received:', {
            qr_data: body.qr_data,
            meal_type: body.meal_type,
            qr_token: body.qr_token
        });

        const parsedQrData = parseAttendanceQrPayload(body.qr_data);
        const parsedMealType = parseAttendanceQrPayload(body.meal_type);
        const parsedQrToken = parseAttendanceQrPayload(body.qr_token);
        const scannedMealType = parsedQrData.mealType || parsedMealType.mealType || parsedQrToken.mealType;

        console.log('[Attendance] Raw scanned QR value:', parsedQrData.rawValue || parsedMealType.rawValue || parsedQrToken.rawValue);
        console.log('[Attendance] Parsed QR data:', parsedQrData.parsedValue ?? parsedMealType.parsedValue ?? parsedQrToken.parsedValue ?? null);
        console.log('[Attendance] Expected format:', ATTENDANCE_QR_EXPECTED_FORMAT);

        if (!scannedMealType) {
            return res.status(400).json({ error: 'Invalid QR code' });
        }

        const ist = getISTNow();
        console.log(`[Attendance] Current IST: ${ist.dateString} ${ist.timeString}`);

        const timingCheck = isWithinMealTime(
            getMealTimingForType(scannedMealType)?.start || '',
            getMealTimingForType(scannedMealType)?.end || ''
        );
        console.log('[Attendance] Meal validation result:', {
            meal_type: scannedMealType,
            within_window: timingCheck.within,
            current_time: timingCheck.currentTime,
            start_time: timingCheck.startTime,
            end_time: timingCheck.endTime
        });

        const mealRes = await client.query(
            `SELECT id, date, meal_type, start_time, end_time
             FROM meals
             WHERE meal_type = $1 AND date = $2
             ORDER BY start_time ASC
             LIMIT 1`,
            [scannedMealType, ist.dateString]
        );
        if (mealRes.rows.length === 0) {
            return res.status(404).json({ error: 'No meal found for scanned meal type today' });
        }

        const meal = mealRes.rows[0];
        // IST-aware time window check using canonical shared meal timings
        const mealType = normalizeMealType(meal.meal_type) || scannedMealType;
        const canonicalTiming = getMealTimingForType(mealType) || getMealTimingForType(scannedMealType);
        const startTime = canonicalTiming?.start || String(meal.start_time || '').slice(0, 5);
        const endTime = canonicalTiming?.end || String(meal.end_time || '').slice(0, 5);

        const timeCheck = isWithinMealTime(startTime, endTime);
        console.log(`[Attendance] IST time: ${timeCheck.currentTime}, meal window: ${timeCheck.startTime}-${timeCheck.endTime}, within: ${timeCheck.within}`);

        if (!timeCheck.within) {
            return res.status(400).json({
                error: 'Meal time is over',
                detail: `Attendance is allowed from ${formatTime12h(startTime)} to ${formatTime12h(endTime)} IST`,
                allowed_window: { start: startTime, end: endTime },
                current_time_ist: timeCheck.currentTime
            });
        }

        await client.query('BEGIN');
        transactionStarted = true;

        let attendance;
        try {
            const insertRes = await client.query(
                `INSERT INTO attendance (user_id, meal_id)
                 VALUES ($1, $2)
                 RETURNING id, scanned_at`,
                [req.user.id, meal.id]
            );
            attendance = insertRes.rows[0];
        } catch (error) {
            if (error.code === '23505') {
                await client.query('ROLLBACK');
                transactionStarted = false;
                return res.status(409).json({ error: 'Attendance already marked' });
            }
            throw error;
        }

        await client.query(
            `INSERT INTO student_rewards (user_id, points, total_meals, last_updated)
             VALUES ($1, 10, 1, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
                points = student_rewards.points + 10,
                total_meals = student_rewards.total_meals + 1,
                last_updated = NOW()
             RETURNING points, total_meals`,
            [req.user.id]
        );

        await client.query(
            `UPDATE meal_bookings
             SET checked_in_at = COALESCE(checked_in_at, NOW()),
                 status = CASE WHEN status = 'confirmed' THEN 'consumed' ELSE status END,
                 updated_at = NOW()
             WHERE user_id = $1 AND meal_id = $2`,
            [req.user.id, meal.id]
        );

        const rewardsRes = await client.query(
            'SELECT points, total_meals FROM student_rewards WHERE user_id = $1',
            [req.user.id]
        );
        const rewards = rewardsRes.rows[0] || { points: 0, total_meals: 0 };
        const discountPercent = Math.min(25, Math.max(0, Math.floor((Number(rewards.points) || 0) / 100)));
        const effectiveFee = Number((DEFAULT_MEAL_BASE_FEE * (1 - discountPercent / 100)).toFixed(2));

        await client.query('COMMIT');
        transactionStarted = false;
        return res.json({
            message: 'Attendance successfully recorded',
            scanned_at: attendance.scanned_at,
            rewards: {
                points: Number(rewards.points) || 0,
                total_meals: Number(rewards.total_meals) || 0
            },
            fee_preview: {
                base_fee: DEFAULT_MEAL_BASE_FEE,
                discount_percent: discountPercent,
                effective_fee: effectiveFee
            }
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error('Attendance scan error:', {
            message: error?.message,
            stack: error?.stack
        });
        return res.status(500).json({ error: 'Unable to process attendance right now' });
    } finally {
        client.release();
    }
});

// GET /api/attendance/history - Get attendance history for current student
app.get('/api/attendance/history', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const historyRes = await pool.query(
            `SELECT a.id, a.scanned_at, m.meal_type
             FROM attendance a
             JOIN meals m ON a.meal_id = m.id
             WHERE a.user_id = $1
             ORDER BY a.scanned_at DESC`,
            [req.user.id]
        );
        
        const history = historyRes.rows.map(row => {
            const dateObj = new Date(row.scanned_at);
            const istStr = dateObj.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
            const istDate = new Date(istStr);
            
            const istDateStr = istDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
            const istTimeStr = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            return {
                id: row.id,
                date: istDateStr,
                meal: String(row.meal_type || 'meal'),
                time: formatTime12h(istTimeStr),
                status: 'present' // default
            };
        });

        return res.json(history);
    } catch (error) {
        console.error('Attendance history error:', error);
        return res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

// GET /api/rewards/summary - current student's reward summary
app.get('/api/rewards/summary', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const rewardsRes = await pool.query(
            'SELECT points, total_meals FROM student_rewards WHERE user_id = $1',
            [req.user.id]
        );
        const rewards = rewardsRes.rows[0] || { points: 0, total_meals: 0 };
        const points = Number(rewards.points) || 0;
        const discountPercent = Math.min(25, Math.max(0, Math.floor(points / 100)));
        const effectiveFee = Number((DEFAULT_MEAL_BASE_FEE * (1 - discountPercent / 100)).toFixed(2));

        return res.json({
            rewards: {
                points,
                total_meals: Number(rewards.total_meals) || 0
            },
            fee_preview: {
                base_fee: DEFAULT_MEAL_BASE_FEE,
                discount_percent: discountPercent,
                effective_fee: effectiveFee
            }
        });
    } catch (error) {
        console.error('Rewards summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch rewards summary' });
    }
});

async function loadVotesForWeek(weekStart) {
    const result = await pool.query(
        'SELECT user_id, day, meal_type, selected_option FROM menu_votes WHERE week_start = $1',
        [weekStart]
    );
    return result.rows;
}

function buildFinalMenuFromVotes(votes = []) {
    const voteCounts = {};
    const finalMenu = {};

    MENU_DAYS.forEach((day) => {
        finalMenu[day] = {};
        voteCounts[day] = {};

        MENU_MEALS.forEach((mealType) => {
            voteCounts[day][mealType] = {};
            DEFAULT_MENU_OPTIONS[day][mealType].forEach((option) => {
                voteCounts[day][mealType][option] = 0;
            });
        });
    });

    votes.forEach((vote) => {
        const day = normalizeDay(vote.day);
        const mealType = normalizeMealType(vote.meal_type);
        const option = String(vote.selected_option || '');

        if (!day || !mealType) return;
        if (!DEFAULT_MENU_OPTIONS[day][mealType].includes(option)) return;

        voteCounts[day][mealType][option] += 1;
    });

    MENU_DAYS.forEach((day) => {
        MENU_MEALS.forEach((mealType) => {
            const options = DEFAULT_MENU_OPTIONS[day][mealType];
            const counts = voteCounts[day][mealType];

            let selected = options[0];
            let maxVotes = -1;

            options.forEach((option) => {
                const count = Number(counts[option] || 0);
                if (count > maxVotes) {
                    maxVotes = count;
                    selected = option;
                }
            });

            finalMenu[day][mealType] = selected;
        });
    });

    return { finalMenu, voteCounts };
}

// GET /api/menu-options - all options for current week
app.get('/api/menu-options', optionalAuth, async (req, res) => {
    try {
        const weekStart = getWeekStartISO();
        const myVotes = {};

        if (req.user?.id) {
            const ownVotes = await pool.query(
                'SELECT day, meal_type, selected_option FROM menu_votes WHERE user_id = $1 AND week_start = $2',
                [req.user.id, weekStart]
            );

            ownVotes.rows.forEach((row) => {
                const day = normalizeDay(row.day);
                const mealType = normalizeMealType(row.meal_type);
                if (!day || !mealType) return;
                myVotes[`${day}_${mealType}`] = row.selected_option;
            });
        }

        res.json({
            week_start: weekStart,
            options: DEFAULT_MENU_OPTIONS,
            my_votes: myVotes
        });
    } catch (error) {
        console.error('Menu options fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch menu options' });
    }
});

// POST /api/vote - save one user vote for one day+meal
app.post('/api/vote', authMiddleware, async (req, res) => {
    try {
        const day = normalizeDay(req.body.day);
        const mealType = normalizeMealType(req.body.mealType);
        const selectedOption = String(req.body.selectedOption || '').trim();
        const weekStart = req.body.weekStart || getWeekStartISO();

        if (!day || !mealType || !selectedOption) {
            return res.status(400).json({ error: 'day, mealType and selectedOption are required' });
        }

        const allowedOptions = DEFAULT_MENU_OPTIONS[day][mealType];
        if (!allowedOptions.includes(selectedOption)) {
            return res.status(400).json({ error: 'Invalid option selected' });
        }

        await pool.query(
            `INSERT INTO menu_votes (user_id, week_start, day, meal_type, selected_option)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, week_start, day, meal_type)
             DO UPDATE SET selected_option = EXCLUDED.selected_option, updated_at = NOW()`,
            [req.user.id, weekStart, day, mealType, selectedOption]
        );

        res.json({ message: 'Vote saved', vote: { userId: req.user.id, day, mealType, selectedOption, weekStart } });
    } catch (error) {
        console.error('Vote save error:', error);
        res.status(500).json({ error: 'Failed to save vote' });
    }
});

// GET /api/final-menu - highest-voted option per day+meal (fallback to default option if no votes)
app.get('/api/final-menu', optionalAuth, async (req, res) => {
    try {
        const weekStart = req.query.week_start || getWeekStartISO();
        const votes = await loadVotesForWeek(weekStart);
        const { finalMenu, voteCounts } = buildFinalMenuFromVotes(votes);

        const voterCountRes = await pool.query(
            'SELECT COUNT(DISTINCT user_id)::int AS voter_count FROM menu_votes WHERE week_start = $1',
            [weekStart]
        );

        const myVotes = {};
        if (req.user?.id) {
            const ownVotes = votes.filter((v) => String(v.user_id) === String(req.user.id));
            ownVotes.forEach((v) => {
                const day = normalizeDay(v.day);
                const mealType = normalizeMealType(v.meal_type);
                if (!day || !mealType) return;
                myVotes[`${day}_${mealType}`] = v.selected_option;
            });
        }

        res.json({
            week_start: weekStart,
            menu: finalMenu,
            vote_counts: voteCounts,
            voter_count: voterCountRes.rows[0]?.voter_count || 0,
            my_votes: myVotes
        });
    } catch (error) {
        console.error('Final menu fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch final menu' });
    }
});

// GET /api/finalized-menu - backward-compatible format used by existing frontend context
app.get('/api/finalized-menu', optionalAuth, async (req, res) => {
    try {
        const weekStart = req.query.week_start || getWeekStartISO();
        const votes = await loadVotesForWeek(weekStart);
        const { finalMenu } = buildFinalMenuFromVotes(votes);

        const menuMap = {};
        MENU_DAYS.forEach((day) => {
            MENU_MEALS.forEach((mealType) => {
                const key = `${day.toLowerCase()}_${mealType}`;
                menuMap[key] = {
                    id: null,
                    meal_id: null,
                    day: day.toLowerCase(),
                    meal_type: mealType,
                    name: finalMenu?.[day]?.[mealType] || DEFAULT_MENU_OPTIONS[day][mealType][0],
                    vote_count: 0,
                    used_default: true
                };
            });
        });

        res.json({
            week_start: weekStart,
            menu_map: menuMap,
            voter_count: 0
        });
    } catch (error) {
        console.error('Finalized menu fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch finalized menu' });
    }
});

// GET /api/menus - compatibility summary for UI cards
app.get('/api/menus', async (req, res) => {
    try {
        const weekStart = req.query.week_start || getWeekStartISO();
        const votes = await loadVotesForWeek(weekStart);
        const { finalMenu } = buildFinalMenuFromVotes(votes);

        const menus = MENU_DAYS.map((day) => ({
            day,
            meal: finalMenu[day]?.lunch || DEFAULT_MENU_OPTIONS[day]?.lunch?.[0] || '',
            meals: finalMenu[day] || {}
        }));

        res.json({ week_start: weekStart, menus });
    } catch (error) {
        console.error('Menus fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch menus' });
    }
});

// GET /api/admin/week-menu?start_date=YYYY-MM-DD
app.get('/api/admin/week-menu', authMiddleware, requireRole(['super_admin', 'mess_manager']), async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date().toISOString().split('T')[0];
        const result = await pool.query(
            "SELECT m.id, m.date, m.meal_type, m.start_time, m.end_time, " +
            "COALESCE(STRING_AGG(mm.item_name, ', ' ORDER BY mm.sort_order), '') AS items " +
            "FROM meals m " +
            "LEFT JOIN meal_menus mm ON mm.meal_id = m.id " +
            "WHERE m.date >= $1::date AND m.date <= ($1::date + INTERVAL '6 days') " +
            "GROUP BY m.id " +
            "ORDER BY m.date, m.start_time",
            [startDate]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Week menu fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch week menu' });
    }
});

// PUT /api/admin/week-menu - Upsert single day+meal menu with items
app.put('/api/admin/week-menu', authMiddleware, requireRole(['super_admin', 'mess_manager']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { date, meal_type, start_time, end_time, items } = req.body;
        if (!date || !meal_type || !start_time || !end_time) {
            return res.status(400).json({ error: 'date, meal_type, start_time and end_time are required' });
        }

        await client.query('BEGIN');
        const upsertMeal = await client.query(
            "INSERT INTO meals (id, meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, is_active, created_by) " +
            "VALUES (uuid_generate_v4(), $1, $2, $3, $4, ($2::date - INTERVAL '1 day') + $3::time, ($2::date - INTERVAL '1 day') + $3::time, true, $5) " +
            "ON CONFLICT (meal_type, date) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, updated_at = NOW() " +
            "RETURNING id",
            [meal_type, date, start_time, end_time, req.user.id]
        );
        const mealId = upsertMeal.rows[0].id;

        await client.query("DELETE FROM meal_menus WHERE meal_id = $1", [mealId]);
        const parsedItems = Array.isArray(items) ? items : String(items || '').split(',').map((x) => x.trim()).filter(Boolean);
        for (let i = 0; i < parsedItems.length; i += 1) {
            await client.query(
                "INSERT INTO meal_menus (id, meal_id, item_name, sort_order) VALUES (uuid_generate_v4(), $1, $2, $3)",
                [mealId, parsedItems[i], i]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Week menu updated', meal_id: mealId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Week menu update error:', error);
        res.status(500).json({ error: 'Failed to update week menu' });
    } finally {
        client.release();
    }
});

// GET /api/meal-bookings?date=YYYY-MM-DD — get current user's bookings for a date
app.get('/api/meal-bookings', authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date parameter required' });

        const result = await pool.query(
            'SELECT meal_id FROM meal_bookings WHERE user_id = $1 AND booking_date = $2',
            [req.user.id, date]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// GET /api/meal-bookings/history — get booking history for current user
app.get('/api/meal-bookings/history', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT mb.id, mb.status, mb.is_auto_booked, mb.booking_date,
                    m.meal_type, m.start_time
             FROM meal_bookings mb
             LEFT JOIN meals m ON mb.meal_id = m.id
             WHERE mb.user_id = $1
             ORDER BY mb.booking_date DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch booking history' });
    }
});

// POST /api/meal-bookings — create a booking
app.post('/api/meal-bookings', authMiddleware, async (req, res) => {
    try {
        const { meal_id, booking_date } = req.body;
        const result = await pool.query(
            `INSERT INTO meal_bookings (user_id, meal_id, booking_date, status)
             VALUES ($1, $2, $3, 'confirmed')
             RETURNING id`,
            [req.user.id, meal_id, booking_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Booking already exists' });
        }
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// DELETE /api/meal-bookings — cancel a booking
app.delete('/api/meal-bookings', authMiddleware, async (req, res) => {
    try {
        const { meal_id } = req.body;
        await pool.query(
            'DELETE FROM meal_bookings WHERE user_id = $1 AND meal_id = $2',
            [req.user.id, meal_id]
        );
        res.json({ message: 'Booking cancelled' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/feedback — save or update feedback (upsert)
app.post('/api/feedback', authMiddleware, async (req, res) => {
    try {
        const { user_id, user_role, day, meal_type, rating, comment, finalized_meal_id } = req.body;

        if (!rating) return res.status(400).json({ error: 'Rating is mandatory' });
        if (comment && comment.length > 300) return res.status(400).json({ error: 'Comment exceeds 300 characters' });

        const result = await pool.query(
            `INSERT INTO meal_feedback (user_id, user_role, day, meal_type, rating, comment, finalized_meal_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (user_id, day, meal_type)
             DO UPDATE SET rating = $5, comment = $6, finalized_meal_id = $7, created_at = NOW()
             RETURNING *`,
            [user_id || req.user.id, user_role || 'student', day, meal_type, rating, comment || null, finalized_meal_id || null]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: error.message || 'Failed to save feedback' });
    }
});

// GET /api/feedback — fetch feedback with filters
app.get('/api/feedback', optionalAuth, async (req, res) => {
    try {
        const { day, meal_type, rating, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT mf.*,
                   up.full_name as "user_full_name",
                   up.hostel_id as "user_hostel_id"
            FROM meal_feedback mf
            LEFT JOIN user_profiles up ON mf.user_id = up.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (day) { query += ` AND mf.day = $${paramIndex++}`; params.push(day); }
        if (meal_type) { query += ` AND mf.meal_type = $${paramIndex++}`; params.push(meal_type); }
        if (rating) { query += ` AND mf.rating = $${paramIndex++}`; params.push(parseInt(rating)); }

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM meal_feedback mf WHERE 1=1${day ? ` AND mf.day = '${day}'` : ''}${meal_type ? ` AND mf.meal_type = '${meal_type}'` : ''}${rating ? ` AND mf.rating = ${parseInt(rating)}` : ''}`,
        );

        query += ` ORDER BY mf.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Reshape to match the structure the frontend expects
        const data = result.rows.map(row => ({
            ...row,
            user_profiles: {
                full_name: row.user_full_name,
                hostel_name: row.user_hostel_id
            }
        }));

        res.json({ success: true, data, count: parseInt(countResult.rows[0].count) });
    } catch (error) {
        console.error('Feedback fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CHEF ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/chef/menu — Get today's menu and pre-booked count
app.get('/api/chef/menu', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*, 
                (SELECT COUNT(*) FROM meal_bookings mb WHERE mb.meal_id = m.id AND mb.status = 'confirmed') as booked_count
             FROM meals m 
             WHERE m.date = CURRENT_DATE
             ORDER BY m.start_time ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Chef menu error:', error);
        res.status(500).json({ error: 'Failed to fetch chef menu' });
    }
});

// GET /api/chef/prediction — AI Waste Predictor
app.get('/api/chef/prediction', optionalAuth, async (req, res) => {
    try {
        const date = new Date().toISOString().split('T')[0];

        // Find today's meals
        const mealsRes = await pool.query(
            `SELECT m.id, m.meal_type, 
                (SELECT COUNT(*) FROM meal_bookings mb WHERE mb.meal_id = m.id AND mb.status = 'confirmed') as booked_count
             FROM meals m 
             WHERE m.date = CURRENT_DATE`
        );

        const predictions = [];

        for (const meal of mealsRes.rows) {
            // Get historical wastage for this meal type
            const historyRes = await pool.query(
                `SELECT quantity_wasted, quantity_prepared FROM wastage_logs 
                 WHERE meal_type = $1 ORDER BY date DESC LIMIT 5`,
                [meal.meal_type]
            );

            let avgWasteRatio = 0.15; // default 15% waste
            if (historyRes.rows.length > 0) {
                let totalRatio = 0;
                let dataPoints = 0;
                for (const row of historyRes.rows) {
                    if (row.quantity_prepared > 0) {
                        totalRatio += (row.quantity_wasted / row.quantity_prepared);
                        dataPoints++;
                    }
                }
                if (dataPoints > 0) avgWasteRatio = totalRatio / dataPoints;
            }

            const booked = parseInt(meal.booked_count) || 100;
            const standardPortion = 0.5; // 0.5kg per meal roughly

            const predictedDemandKg = Math.ceil(booked * standardPortion);
            const recommendedPreparedKg = Math.ceil(predictedDemandKg * (1 - (avgWasteRatio * 0.5))); // AI recommends making slightly less to prevent waste

            predictions.push({
                meal_type: meal.meal_type,
                booked_students: booked,
                predicted_demand_kg: predictedDemandKg,
                recommended_prepare_kg: recommendedPreparedKg,
                waste_risk_indicator: avgWasteRatio > 0.2 ? 'HIGH' : (avgWasteRatio > 0.1 ? 'MEDIUM' : 'LOW'),
                predicted_waste_saving_kg: predictedDemandKg - recommendedPreparedKg
            });
        }

        res.json({ success: true, ai_prediction: predictions, date });
    } catch (error) {
        console.error('Chef prediction error:', error);
        res.status(500).json({ error: 'Failed to generate AI prediction' });
    }
});

// POST /api/chef/waste-report — Log food preparation and wastage
app.post('/api/chef/waste-report', authMiddleware, async (req, res) => {
    try {
        const { meal_id, meal_type, quantity_prepared, quantity_consumed, quantity_wasted, notes } = req.body;

        const result = await pool.query(
            `INSERT INTO wastage_logs 
               (meal_id, date, meal_type, quantity_prepared, quantity_consumed, quantity_wasted, logged_by, notes)
             VALUES 
               ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [meal_id || null, meal_type, quantity_prepared, quantity_consumed, quantity_wasted, req.user.id, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Chef waste report error:', error);
        res.status(500).json({ error: 'Failed to save waste report' });
    }
});

// GET /api/chef/inventory — Get inventory stock
app.get('/api/chef/inventory', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory ORDER BY status, item_name ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// GET /api/inventory - Generic inventory list
app.get('/api/inventory', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT i.id, i.item_name, i.quantity, i.unit, i.reorder_level, i.max_stock_level, i.storage_location, " +
            "i.status, i.is_active, i.updated_at, COALESCE(ic.name, 'Uncategorized') AS category " +
            "FROM inventory i " +
            "LEFT JOIN inventory_categories ic ON i.category_id = ic.id " +
            "WHERE i.is_active = true " +
            "ORDER BY i.item_name ASC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Inventory list error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /api/inventory - Create inventory item
app.post('/api/inventory', authMiddleware, requireRole(['super_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const { item_name, category_id, quantity, unit, reorder_level, max_stock_level, storage_location, status } = req.body;
        if (!item_name || !unit) {
            return res.status(400).json({ error: 'item_name and unit are required' });
        }

        const result = await pool.query(
            "INSERT INTO inventory (item_name, category_id, quantity, unit, reorder_level, max_stock_level, storage_location, status, is_active) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) " +
            "RETURNING *",
            [
                item_name,
                category_id || null,
                Number(quantity) || 0,
                unit,
                Number(reorder_level) || 0,
                Number(max_stock_level) || 0,
                storage_location || null,
                status || 'in_stock'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Inventory create error:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
});

// PUT /api/inventory/:id - Update inventory item
app.put('/api/inventory/:id', authMiddleware, requireRole(['super_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = ['item_name', 'category_id', 'quantity', 'unit', 'reorder_level', 'max_stock_level', 'storage_location', 'status'];
        const updates = [];
        const values = [];
        let idx = 1;

        allowed.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${idx++}`);
                values.push(req.body[field]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE inventory SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Inventory update error:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// DELETE /api/inventory/:id - Soft delete inventory item
app.delete('/api/inventory/:id', authMiddleware, requireRole(['super_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE inventory SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.json({ message: 'Inventory item removed' });
    } catch (error) {
        console.error('Inventory delete error:', error);
        res.status(500).json({ error: 'Failed to remove inventory item' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/chef/analytics - Waste charts + efficiency metrics
app.get('/api/chef/analytics', optionalAuth, async (req, res) => {
    try {
        const [weeklyRes, byMealRes, trendRes, totalsRes] = await Promise.all([
            pool.query(
                "SELECT TO_CHAR(ds.day, 'Dy') AS day, " +
                "ROUND(COALESCE(SUM(wl.quantity_wasted), 0)::numeric, 2)::float AS amount " +
                "FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS ds(day) " +
                "LEFT JOIN wastage_logs wl ON wl.date = ds.day::date " +
                "GROUP BY ds.day ORDER BY ds.day"
            ),
            pool.query(
                "SELECT INITCAP(meal_type) AS name, " +
                "ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS value " +
                "FROM wastage_logs " +
                "WHERE date >= CURRENT_DATE - INTERVAL '30 days' " +
                "GROUP BY meal_type ORDER BY value DESC"
            ),
            pool.query(
                "SELECT TO_CHAR(ws.week_start, 'Mon DD') AS name, " +
                "ROUND(COALESCE(SUM(wl.quantity_wasted), 0)::numeric, 2)::float AS value " +
                "FROM generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks', date_trunc('week', CURRENT_DATE), INTERVAL '1 week') AS ws(week_start) " +
                "LEFT JOIN wastage_logs wl ON date_trunc('week', wl.date) = ws.week_start " +
                "GROUP BY ws.week_start ORDER BY ws.week_start"
            ),
            pool.query(
                "SELECT " +
                "ROUND(COALESCE(SUM(quantity_prepared), 0)::numeric, 2)::float AS total_prepared_kg, " +
                "ROUND(COALESCE(SUM(quantity_consumed), 0)::numeric, 2)::float AS total_consumed_kg, " +
                "ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS total_wasted_kg " +
                "FROM wastage_logs WHERE date >= CURRENT_DATE - INTERVAL '6 days'"
            )
        ]);

        const totals = totalsRes.rows[0] || {};
        const prepared = parseFloat(totals.total_prepared_kg || 0);
        const consumed = parseFloat(totals.total_consumed_kg || 0);
        const wasted = parseFloat(totals.total_wasted_kg || 0);
        const utilizationRate = prepared > 0 ? Number(((consumed / prepared) * 100).toFixed(1)) : 0;
        const wasteRate = prepared > 0 ? Number(((wasted / prepared) * 100).toFixed(1)) : 0;

        res.json({
            weekly_waste: weeklyRes.rows,
            waste_by_meal: byMealRes.rows,
            waste_trend: trendRes.rows,
            efficiency: {
                total_prepared_kg: prepared,
                total_consumed_kg: consumed,
                total_wasted_kg: wasted,
                utilization_rate: utilizationRate,
                waste_rate: wasteRate
            }
        });
    } catch (error) {
        console.error('Chef analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch chef analytics' });
    }
});

// GET /api/chef/feedback - Recent student meal feedback for kitchen review
app.get('/api/chef/feedback', optionalAuth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '8', 10), 30);

        const [feedbackRes, summaryRes] = await Promise.all([
            pool.query(
                "SELECT mf.id, mf.meal_type, mf.rating, mf.comment, mf.created_at, " +
                "COALESCE(up.full_name, 'Student') AS student_name " +
                "FROM meal_feedback mf " +
                "LEFT JOIN user_profiles up ON mf.user_id = up.id " +
                "ORDER BY mf.created_at DESC " +
                "LIMIT $1",
                [limit]
            ),
            pool.query(
                "SELECT COUNT(*)::int AS total_feedback, " +
                "ROUND(COALESCE(AVG(rating), 0)::numeric, 1)::float AS avg_rating " +
                "FROM meal_feedback " +
                "WHERE created_at >= NOW() - INTERVAL '7 days'"
            )
        ]);

        res.json({
            feedback: feedbackRes.rows,
            summary: summaryRes.rows[0] || { total_feedback: 0, avg_rating: 0 }
        });
    } catch (error) {
        console.error('Chef feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch chef feedback' });
    }
});
// NGO ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/ngo/donations — Get available leftover food
app.get('/api/ngo/donations', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.*, m.meal_type, m.start_time, h.name as hostel_name, h.address as hostel_address
             FROM donations d
             LEFT JOIN meals m ON d.meal_id = m.id
             LEFT JOIN user_profiles up ON d.created_by = up.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE d.status IN ('available', 'reserved', 'scheduled')
             ORDER BY d.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('NGO donations error:', error);
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
});

// GET /api/donations - Generic donation list alias
app.get('/api/donations', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.*, m.meal_type, h.name as hostel_name, h.address as hostel_address
             FROM donations d
             LEFT JOIN meals m ON d.meal_id = m.id
             LEFT JOIN user_profiles up ON d.created_by = up.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE d.status <> 'cancelled'
             ORDER BY d.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Donations list error:', error);
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
});

// POST /api/donations - Create donation entry
app.post('/api/donations', authMiddleware, requireRole(['super_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const { meal_id, food_items, total_quantity_kg, estimated_servings, pickup_location, notes } = req.body;
        if (!food_items || Number(total_quantity_kg) <= 0) {
            return res.status(400).json({ error: 'food_items and total_quantity_kg are required' });
        }

        const result = await pool.query(
            "INSERT INTO donations (meal_id, food_items, total_quantity_kg, estimated_servings, pickup_location, notes, status, created_by) " +
            "VALUES ($1, $2::jsonb, $3, $4, $5, $6, 'available', $7) RETURNING *",
            [
                meal_id || null,
                JSON.stringify(Array.isArray(food_items) ? food_items : []),
                Number(total_quantity_kg),
                Number(estimated_servings) || null,
                pickup_location || null,
                notes || null,
                req.user.id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Donation create error:', error);
        res.status(500).json({ error: 'Failed to create donation' });
    }
});

// POST /api/ngo/claim — Claim a food donation
app.post('/api/ngo/claim', authMiddleware, async (req, res) => {
    try {
        const { donation_id } = req.body;
        const result = await pool.query(
            `UPDATE donations 
             SET status = 'scheduled', picked_up_by = $1, pickup_scheduled_at = NOW() + interval '2 hours', updated_at = NOW()
             WHERE id = $2 AND status = 'available'
             RETURNING *`,
            [req.user.email || 'NGO Representative', donation_id]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Donation no longer available' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('NGO claim error:', error);
        res.status(500).json({ error: 'Failed to claim donation' });
    }
});

// PUT /api/ngo/update-status — Update pickup status
app.put('/api/ngo/update-status', authMiddleware, async (req, res) => {
    try {
        const { donation_id, status } = req.body;
        const validStatuses = ['picked_up', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let query = `UPDATE donations SET status = $1, updated_at = NOW()`;
        const params = [status, donation_id];

        if (status === 'picked_up') {
            query += `, picked_up_at = NOW()`;
        }

        query += ` WHERE id = $2 RETURNING *`;

        const result = await pool.query(query, params);
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('NGO update status error:', error);
        res.status(500).json({ error: 'Failed to update donation status' });
    }
});

// GET /api/ngo/history - Past claims and distribution history for current NGO account
app.get('/api/ngo/history', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT d.id, d.status, d.total_quantity_kg, d.estimated_servings, d.pickup_scheduled_at, " +
            "d.picked_up_at, d.updated_at, d.pickup_location, d.notes, " +
            "m.meal_type, h.name as hostel_name, h.address as hostel_address " +
            "FROM donations d " +
            "LEFT JOIN meals m ON d.meal_id = m.id " +
            "LEFT JOIN user_profiles up ON d.created_by = up.id " +
            "LEFT JOIN hostels h ON up.hostel_id = h.id " +
            "WHERE d.picked_up_by = $1 " +
            "AND d.status IN ('picked_up', 'completed', 'cancelled') " +
            "ORDER BY COALESCE(d.updated_at, d.created_at) DESC " +
            "LIMIT 50",
            [req.user.email]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('NGO history error:', error);
        res.status(500).json({ error: 'Failed to fetch donation history' });
    }
});

// GET /api/ngo/analytics - Donation analytics for the dashboard
app.get('/api/ngo/analytics', authMiddleware, async (req, res) => {
    try {
        const [statusRes, monthlyRes] = await Promise.all([
            pool.query(
                "SELECT status as name, COUNT(*)::int as value " +
                "FROM donations " +
                "WHERE picked_up_by = $1 " +
                "GROUP BY status " +
                "ORDER BY value DESC",
                [req.user.email]
            ),
            pool.query(
                "SELECT TO_CHAR(ms.month_start, 'Mon') as month, " +
                "ROUND(COALESCE(SUM(d.total_quantity_kg), 0)::numeric, 2)::float as quantity_kg " +
                "FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS ms(month_start) " +
                "LEFT JOIN donations d ON date_trunc('month', d.created_at) = ms.month_start AND d.picked_up_by = $1 " +
                "GROUP BY ms.month_start " +
                "ORDER BY ms.month_start",
                [req.user.email]
            )
        ]);

        res.json({
            status_breakdown: statusRes.rows,
            monthly_collection: monthlyRes.rows
        });
    } catch (error) {
        console.error('NGO analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch donation analytics' });
    }
});

// GET /api/ngo/notifications - Upcoming and delayed pickup notifications
app.get('/api/ngo/notifications', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT d.id, d.status, d.pickup_scheduled_at, d.total_quantity_kg, " +
            "m.meal_type, h.name as hostel_name " +
            "FROM donations d " +
            "LEFT JOIN meals m ON d.meal_id = m.id " +
            "LEFT JOIN user_profiles up ON d.created_by = up.id " +
            "LEFT JOIN hostels h ON up.hostel_id = h.id " +
            "WHERE d.picked_up_by = $1 " +
            "AND d.status = 'scheduled' " +
            "ORDER BY d.pickup_scheduled_at ASC",
            [req.user.email]
        );

        const now = new Date();
        const notifications = result.rows.map((row) => {
            const pickupAt = row.pickup_scheduled_at ? new Date(row.pickup_scheduled_at) : null;
            const minutesToPickup = pickupAt ? Math.round((pickupAt.getTime() - now.getTime()) / 60000) : null;
            let priority = 'info';
            if (minutesToPickup !== null && minutesToPickup <= 0) priority = 'critical';
            else if (minutesToPickup !== null && minutesToPickup <= 30) priority = 'warning';

            return {
                ...row,
                minutes_to_pickup: minutesToPickup,
                priority
            };
        });

        res.json(notifications);
    } catch (error) {
        console.error('NGO notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
// GET /api/ngo/impact — NGO Impact Stats
app.get('/api/ngo/impact', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_donations,
                SUM(total_quantity_kg) as food_collected_kg,
                SUM(estimated_servings) as people_fed
             FROM donations 
             WHERE status = 'completed'`
        );

        const stats = result.rows[0];

        res.json({
            meals_saved: parseInt(stats.total_donations) || 0,
            food_collected_kg: parseFloat(stats.food_collected_kg) || 0,
            people_fed: parseInt(stats.people_fed) || 0,
            waste_prevented_kg: parseFloat(stats.food_collected_kg) || 0
        });
    } catch (error) {
        console.error('NGO impact error:', error);
        res.status(500).json({ error: 'Failed to fetch impact stats' });
    }
});

// GET /api/analytics/overview - Aggregated metrics/charts for admin and reports
app.get('/api/analytics/overview', authMiddleware, requireRole(['super_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const [metrics, monthlyWasteRes, servedVsWastedRes, wasteByHostelRes, ngoPickupRes, recentActivitiesRes, activeAlertsRes] = await Promise.all([
            fetchOverviewMetrics(),
            pool.query(
                "SELECT TO_CHAR(ms.month_start, 'Mon') AS month, " +
                "ROUND(COALESCE(SUM(wl.quantity_wasted), 0)::numeric, 2)::float AS reduction " +
                "FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS ms(month_start) " +
                "LEFT JOIN wastage_logs wl ON date_trunc('month', wl.date) = ms.month_start " +
                "GROUP BY ms.month_start ORDER BY ms.month_start"
            ),
            pool.query(
                "SELECT TO_CHAR(ms.month_start, 'Mon') AS month, " +
                "COALESCE((SELECT COUNT(*)::int FROM meal_bookings mb WHERE date_trunc('month', mb.booking_date) = ms.month_start), 0) AS served, " +
                "COALESCE((SELECT ROUND(SUM(quantity_wasted))::int FROM wastage_logs wl WHERE date_trunc('month', wl.date) = ms.month_start), 0) AS wasted " +
                "FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS ms(month_start) " +
                "ORDER BY ms.month_start"
            ),
            pool.query(
                "SELECT h.name AS hostel, ROUND(COALESCE(SUM(wl.quantity_wasted), 0)::numeric, 2)::float AS waste " +
                "FROM hostels h " +
                "LEFT JOIN user_profiles up ON up.hostel_id = h.id " +
                "LEFT JOIN wastage_logs wl ON wl.logged_by = up.id AND wl.date >= CURRENT_DATE - INTERVAL '30 days' " +
                "GROUP BY h.name ORDER BY waste DESC"
            ),
            pool.query(
                "SELECT COALESCE(d.picked_up_by, 'Unassigned') AS ngo, COUNT(*)::int AS pickups " +
                "FROM donations d WHERE d.status IN ('scheduled', 'picked_up', 'completed') " +
                "GROUP BY d.picked_up_by ORDER BY pickups DESC LIMIT 6"
            ),
            pool.query(
                "SELECT 'Donation created by ' || COALESCE(up.full_name, 'Operator') || ' (' || ROUND(d.total_quantity_kg)::int || ' kg)' AS text " +
                "FROM donations d LEFT JOIN user_profiles up ON d.created_by = up.id ORDER BY d.created_at DESC LIMIT 6"
            ),
            pool.query(
                "SELECT item_name, quantity, reorder_level FROM inventory " +
                "WHERE is_active = true AND quantity <= reorder_level ORDER BY quantity ASC LIMIT 6"
            )
        ]);

        const activities = recentActivitiesRes.rows.map((row) => row.text);
        const alerts = activeAlertsRes.rows.map((row) => `${row.item_name} low stock (${row.quantity}/${row.reorder_level})`);

        res.json({
            metrics,
            monthly_waste_reduction: monthlyWasteRes.rows,
            served_vs_wasted: servedVsWastedRes.rows,
            waste_by_hostel: wasteByHostelRes.rows,
            ngo_pickup_frequency: ngoPickupRes.rows,
            activities,
            alerts
        });
    } catch (error) {
        console.error('Overview analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

// GET /api/student/dashboard - Student summary card data
app.get('/api/student/dashboard', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const [bookingsRes, donationsRes, wasteRes] = await Promise.all([
            pool.query(
                "SELECT COUNT(*)::int AS meals_booked FROM meal_bookings WHERE user_id = $1 AND status = 'confirmed'",
                [req.user.id]
            ),
            pool.query(
                "SELECT COUNT(*)::int AS donations_count FROM donations WHERE status = 'completed'"
            ),
            pool.query(
                "SELECT ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS total_waste FROM wastage_logs WHERE date >= CURRENT_DATE - INTERVAL '30 days'"
            )
        ]);

        const mealsBooked = bookingsRes.rows[0]?.meals_booked || 0;
        const wasteKg = wasteRes.rows[0]?.total_waste || 0;
        const sustainabilityScore = Math.max(0, 100 - Math.min(100, Math.round(wasteKg)));

        res.json({
            meals_booked: mealsBooked,
            wastes_prevented_kg: wasteKg,
            sustainability_score: sustainabilityScore,
            donations_completed: donationsRes.rows[0]?.donations_count || 0
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch student dashboard data' });
    }
});

// GET /api/mess-manager/dashboard - Mess manager summary
app.get('/api/mess-manager/dashboard', authMiddleware, requireRole(['mess_manager', 'super_admin']), async (req, res) => {
    try {
        const [bookingsRes, expectedRes, lowStockRes, wastageRes, alertsRes] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS total_bookings FROM meal_bookings WHERE booking_date = CURRENT_DATE AND status = 'confirmed'"),
            pool.query("SELECT COUNT(*)::int AS expected_attendance FROM meal_bookings WHERE booking_date = CURRENT_DATE"),
            pool.query("SELECT COUNT(*)::int AS low_stock_items FROM inventory WHERE is_active = true AND quantity <= reorder_level"),
            pool.query("SELECT ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS today_wastage FROM wastage_logs WHERE date = CURRENT_DATE"),
            pool.query(
                "SELECT id, item_name, quantity, reorder_level FROM inventory " +
                "WHERE is_active = true AND quantity <= reorder_level ORDER BY quantity ASC LIMIT 5"
            )
        ]);

        res.json({
            stats: {
                total_bookings: bookingsRes.rows[0]?.total_bookings || 0,
                expected_attendance: expectedRes.rows[0]?.expected_attendance || 0,
                low_stock_items: lowStockRes.rows[0]?.low_stock_items || 0,
                today_wastage: wastageRes.rows[0]?.today_wastage || 0
            },
            alerts: alertsRes.rows.map((r) => ({
                id: r.id,
                type: 'warning',
                message: `${r.item_name} LOW STOCK (${r.quantity}/${r.reorder_level})`,
                time: 'LIVE'
            }))
        });
    } catch (error) {
        console.error('Mess manager dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch mess manager dashboard data' });
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
    if (err && err.message === 'CORS origin not allowed') {
        return res.status(403).json({ error: 'CORS origin not allowed' });
    }

    console.error('Unhandled error:', err);
    return res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'configured' : '⚠️  DATABASE_URL not set'}`);
});

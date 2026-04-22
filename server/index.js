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
const routes = express.Router();
const defaultCorsOrigins = [
    'http://localhost:5174',
    'https://your-vercel-app.vercel.app'
];
const corsOrigins = String(process.env.CORS_ORIGIN || defaultCorsOrigins.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (corsOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
}));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// ─── Database Connection ────────────────────────────────────────────────────
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

const MENU_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MENU_MEALS = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_MEAL_BASE_FEE = 100;
const REWARD_DISCOUNT_PERCENT = 10;
const REWARD_DISCOUNT_AMOUNT = 10;
const REWARDED_MEAL_FEE = DEFAULT_MEAL_BASE_FEE - REWARD_DISCOUNT_AMOUNT;
const PENALTY_SKIP_THRESHOLD = 4;
const DEFAULT_PENALTY_AMOUNT = 50;
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

function isAttendanceViewer(role) {
    return ['super_admin', 'hostel_admin', 'mess_manager'].includes(normalizeRole(role));
}

function normalizeAttendanceStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'present' || value === 'absent' || value === 'all') {
        return value;
    }
    return '';
}

function normalizePenaltyStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'clear' || value === 'warning' || value === 'penalty') {
        return value;
    }
    return 'clear';
}

function normalizeDateInput(value, fallback = '') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function normalizeMonthInput(value, fallback = '') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    return /^\d{4}-\d{2}$/.test(raw) ? raw : '';
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isPgMissingObjectError(error) {
    return error?.code === '42P01' || error?.code === '42703';
}

function isPgOptionalDataError(error) {
    return isPgMissingObjectError(error);
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

function hasMealWindowEnded(mealDate, endTime, reference = getISTNow()) {
    if (!mealDate || !endTime) return false;

    if (mealDate < reference.dateString) {
        return true;
    }

    if (mealDate > reference.dateString) {
        return false;
    }

    return timeToMinutes(endTime) < (reference.hours * 60 + reference.minutes);
}

function buildBookingQrToken({ userId, mealId, bookingDate, mealType }) {
    return [userId, mealId, bookingDate, mealType].filter(Boolean).join(':');
}

function buildFeePreview({ rewardApplied = false } = {}) {
    return {
        base_fee: DEFAULT_MEAL_BASE_FEE,
        discount_percent: rewardApplied ? REWARD_DISCOUNT_PERCENT : 0,
        effective_fee: rewardApplied ? REWARDED_MEAL_FEE : DEFAULT_MEAL_BASE_FEE
    };
}

function getCurrentMonthKey() {
    return getISTNow().dateString.slice(0, 7);
}

function getMonthDateRange(monthKey = getCurrentMonthKey()) {
    const normalized = normalizeMonthInput(monthKey, getCurrentMonthKey());
    const [year, month] = normalized.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    return { monthKey: normalized, startDate, endDate, month: month - 1, year };
}

async function syncSkippedBookings(client, { userId = '', bookingDate = '', mealType = '' } = {}) {
    const reference = getISTNow();
    const params = [];
    const filters = [
        "mb.status IN ('confirmed', 'booked')",
        "COALESCE(NULLIF(mb.attendance_status, ''), 'pending') <> 'present'"
    ];
    let index = 1;

    if (userId) {
        filters.push(`mb.user_id = $${index++}`);
        params.push(userId);
    }

    if (bookingDate) {
        filters.push(`m.date = $${index++}`);
        params.push(bookingDate);
    }

    if (mealType) {
        filters.push(`m.meal_type = $${index++}`);
        params.push(mealType);
    }

    const skippedCandidates = await client.query(
        `SELECT mb.id AS booking_id,
                mb.user_id,
                mb.meal_id,
                m.date,
                m.meal_type,
                COALESCE(NULLIF(mb.original_price, 0), $${index++}) AS original_price,
                COALESCE(mt.end_time::text, m.end_time::text) AS end_time
         FROM meal_bookings mb
         JOIN meals m ON m.id = mb.meal_id
         LEFT JOIN meal_timings mt ON mt.meal_name = m.meal_type
         WHERE ${filters.join(' AND ')}`,
        [...params, DEFAULT_MEAL_BASE_FEE]
    );

    for (const booking of skippedCandidates.rows) {
        const endTime = String(booking.end_time || '').slice(0, 5);
        if (!hasMealWindowEnded(booking.date, endTime, reference)) {
            continue;
        }

        await client.query(
            `UPDATE meal_bookings
             SET status = 'skipped',
                 attendance_status = 'absent',
                 discounted_price = COALESCE(NULLIF(original_price, 0), $2),
                 reward_applied = false,
                 updated_at = NOW()
             WHERE id = $1`,
            [booking.booking_id, DEFAULT_MEAL_BASE_FEE]
        );

        await client.query(
            `INSERT INTO student_rewards (
                user_id, points, total_meals, total_rewards, skipped_meals_count,
                penalty_status, total_penalties, penalty_note, last_updated
             )
             VALUES ($1, 0, 0, 0, 1, 'warning', 0, 'Skipping meals may trigger a penalty after 4 absences.', NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
                skipped_meals_count = CASE
                    WHEN student_rewards.skipped_meals_count + 1 >= ${PENALTY_SKIP_THRESHOLD} THEN 0
                    ELSE student_rewards.skipped_meals_count + 1
                END,
                penalty_status = CASE
                    WHEN student_rewards.skipped_meals_count + 1 >= ${PENALTY_SKIP_THRESHOLD} THEN 'penalty'
                    WHEN student_rewards.skipped_meals_count + 1 > 0 THEN 'warning'
                    ELSE 'clear'
                END,
                total_penalties = CASE
                    WHEN student_rewards.skipped_meals_count + 1 >= ${PENALTY_SKIP_THRESHOLD} THEN student_rewards.total_penalties + 1
                    ELSE student_rewards.total_penalties
                END,
                last_penalty_at = CASE
                    WHEN student_rewards.skipped_meals_count + 1 >= ${PENALTY_SKIP_THRESHOLD} THEN NOW()
                    ELSE student_rewards.last_penalty_at
                END,
                penalty_note = CASE
                    WHEN student_rewards.skipped_meals_count + 1 >= ${PENALTY_SKIP_THRESHOLD} THEN 'Penalty applied after 4 skipped booked meals.'
                    ELSE 'Skipping meals may trigger a penalty after 4 absences.'
                END,
                last_updated = NOW()`,
            [booking.user_id]
        );
    }
}

function buildMealRecordFilters({ date = '', mealType = '', userId = '', monthKey = '', paymentStatus = '', hostelId = '', block = '' } = {}) {
    const filters = ["mb.status <> 'cancelled'"];
    const params = [];
    let index = 1;

    if (date) {
        filters.push(`m.date = $${index++}`);
        params.push(date);
    }

    if (mealType) {
        filters.push(`m.meal_type = $${index++}`);
        params.push(mealType);
    }

    if (userId) {
        filters.push(`mb.user_id = $${index++}`);
        params.push(userId);
    }

    if (monthKey) {
        const { startDate, endDate } = getMonthDateRange(monthKey);
        filters.push(`m.date >= $${index++}`);
        params.push(startDate);
        filters.push(`m.date <= $${index++}`);
        params.push(endDate);
    }

    if (hostelId) {
        filters.push(`up.hostel_id = $${index++}`);
        params.push(hostelId);
    }

    if (block) {
        filters.push(`LOWER(COALESCE(up.room_number, '')) LIKE $${index++}`);
        params.push(`${String(block).toLowerCase()}%`);
    }

    if (paymentStatus) {
        filters.push(`COALESCE(mb.payment_status, 'unpaid') = $${index++}`);
        params.push(paymentStatus);
    }

    return { filters, params };
}

function getMealRecordsFromClause() {
    return `
        FROM meal_bookings mb
        JOIN meals m ON m.id = mb.meal_id
        JOIN user_profiles up ON up.id = mb.user_id
        LEFT JOIN hostels h ON h.id = up.hostel_id
    `;
}

async function queryMealRecords(client, filters = {}) {
    const { filters: whereFilters, params } = buildMealRecordFilters(filters);
    const result = await client.query(
        `SELECT
            mb.id AS booking_id,
            mb.user_id,
            up.full_name AS student_name,
            up.email,
            up.room_number,
            up.hostel_id,
            h.name AS hostel_name,
            m.id AS meal_id,
            m.date,
            m.meal_type,
            'booked'::text AS booking_status,
            COALESCE(NULLIF(mb.attendance_status, ''), 'pending') AS attendance_status,
            mb.checked_in_at AS scanned_at,
            COALESCE(NULLIF(mb.original_price, 0), $${params.length + 1}) AS original_price,
            COALESCE(NULLIF(mb.discounted_price, 0), COALESCE(NULLIF(mb.original_price, 0), $${params.length + 1})) AS discounted_price,
            COALESCE(mb.reward_applied, false) AS reward_applied
         ${getMealRecordsFromClause()}
         WHERE ${whereFilters.join(' AND ')}
         ORDER BY m.date DESC, m.meal_type ASC, up.full_name ASC`,
        [...params, DEFAULT_MEAL_BASE_FEE]
    );

    return result.rows.map((row) => ({
        id: row.booking_id,
        booking_id: row.booking_id,
        meal_id: row.meal_id,
        user_id: row.user_id,
        student_id: row.user_id,
        name: row.student_name || 'Student',
        student_name: row.student_name || 'Student',
        email: row.email || '',
        room_number: row.room_number || '',
        hostel_id: row.hostel_id || null,
        hostel_name: row.hostel_name || 'Unassigned',
        block: row.room_number ? String(row.room_number).charAt(0).toUpperCase() : 'NA',
        date: row.date,
        meal_type: row.meal_type,
        booking_status: row.booking_status,
        attendance_status: row.attendance_status,
        status: row.attendance_status,
        scanned_at: row.scanned_at,
        original_price: toNumber(row.original_price, DEFAULT_MEAL_BASE_FEE),
        discounted_price: toNumber(row.discounted_price, DEFAULT_MEAL_BASE_FEE),
        reward_applied: Boolean(row.reward_applied)
    }));
}

function buildAttendanceBuckets(records = []) {
    const presentUsers = records.filter((record) => record.attendance_status === 'present');
    const absentUsers = records.filter((record) => ['pending', 'absent'].includes(record.attendance_status));

    return {
        total_present: presentUsers.length,
        total_absent: absentUsers.length,
        present_users: presentUsers,
        absent_users: absentUsers,
        records
    };
}

function buildMealTotals(records = []) {
    const mealsBooked = records.filter((record) => record.booking_status === 'booked').length;
    const mealsAttended = records.filter((record) => record.attendance_status === 'present').length;
    const mealsSkipped = records.filter((record) => record.attendance_status === 'absent').length;
    const presentAbsentRatio = mealsBooked > 0
        ? Number((mealsAttended / mealsBooked).toFixed(2))
        : 0;

    return {
        meals_booked: mealsBooked,
        meals_attended: mealsAttended,
        meals_skipped: mealsSkipped,
        present_absent_ratio: presentAbsentRatio,
        attendance_rate: mealsBooked > 0 ? Number(((mealsAttended / mealsBooked) * 100).toFixed(1)) : 0
    };
}

function buildBillingRow(records = [], settings, student = {}) {
    const bookedMeals = records.length;
    const attendedMeals = records.filter((record) => record.attendance_status === 'present').length;
    const skippedMeals = records.filter((record) => record.attendance_status === 'absent').length;
    const rewards = Number((attendedMeals * settings.reward_discount_per_meal).toFixed(2));
    const penaltyCount = Math.floor(skippedMeals / settings.penalty_skip_threshold);
    const penalties = Number((penaltyCount * settings.penalty_amount).toFixed(2));
    const baseAmount = Number((bookedMeals * settings.meal_price).toFixed(2));
    const finalAmount = Number((baseAmount - rewards + penalties).toFixed(2));
    const paymentStatus = records.every((record) => record.payment_status === 'paid') && records.length > 0 ? 'paid' : 'unpaid';

    return {
        user_id: student.user_id || student.id || '',
        student_name: student.student_name || student.name || 'Student',
        email: student.email || '',
        hostel_name: student.hostel_name || 'Unassigned',
        block: student.block || 'NA',
        total_booked_meals: bookedMeals,
        attended_meals: attendedMeals,
        skipped_meals: skippedMeals,
        rewards,
        penalties,
        penalty_count: penaltyCount,
        final_amount: finalAmount,
        payment_status: paymentStatus,
        base_amount: baseAmount
    };
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
            total_rewards INTEGER NOT NULL DEFAULT 0 CHECK (total_rewards >= 0),
            skipped_meals_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_meals_count >= 0),
            penalty_status VARCHAR(20) NOT NULL DEFAULT 'clear',
            total_penalties INTEGER NOT NULL DEFAULT 0 CHECK (total_penalties >= 0),
            penalty_note TEXT,
            last_penalty_at TIMESTAMPTZ,
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
    await pool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_date DATE');
    await pool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS meal_type VARCHAR(20)');
    await pool.query("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'present'");
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS total_rewards INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS skipped_meals_count INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS penalty_status VARCHAR(20) NOT NULL DEFAULT 'clear'`);
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS total_penalties INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS penalty_note TEXT`);
    await pool.query(`ALTER TABLE student_rewards ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMPTZ`);
    await pool.query(`UPDATE student_rewards SET penalty_status = COALESCE(NULLIF(penalty_status, ''), 'clear')`);
    await pool.query(`ALTER TABLE meal_bookings ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) NOT NULL DEFAULT 100`);
    await pool.query(`ALTER TABLE meal_bookings ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10, 2) NOT NULL DEFAULT 100`);
    await pool.query(`ALTER TABLE meal_bookings ADD COLUMN IF NOT EXISTS reward_applied BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE meal_bookings ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE meal_bookings ADD COLUMN IF NOT EXISTS qr_token TEXT`);
    await pool.query(`UPDATE meal_bookings SET original_price = COALESCE(NULLIF(original_price, 0), 100), discounted_price = COALESCE(NULLIF(discounted_price, 0), COALESCE(NULLIF(original_price, 0), 100))`);
    await pool.query(`UPDATE meal_bookings SET attendance_status = CASE
        WHEN status IN ('consumed', 'attended') THEN 'present'
        WHEN status IN ('no_show', 'skipped') THEN 'absent'
        ELSE COALESCE(NULLIF(attendance_status, ''), 'pending')
    END`);
    await pool.query(`UPDATE meal_bookings SET status = CASE
        WHEN status = 'confirmed' THEN 'booked'
        WHEN status = 'consumed' THEN 'attended'
        WHEN status = 'no_show' THEN 'skipped'
        ELSE status
    END`);
    await pool.query(
        `UPDATE attendance a
         SET attendance_date = COALESCE(a.attendance_date, m.date),
             meal_type = COALESCE(a.meal_type, m.meal_type),
             status = COALESCE(NULLIF(a.status, ''), 'present')
         FROM meals m
         WHERE a.meal_id = m.id
           AND (a.attendance_date IS NULL OR a.meal_type IS NULL OR a.status IS NULL OR a.status = '')`
    );
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attendance_date_meal ON attendance(attendance_date, meal_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, attendance_date DESC)');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_meal ON attendance(user_id, attendance_date, meal_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_meal_bookings_date_type ON meal_bookings(booking_date, attendance_status)');
    console.log('[MealTimings] Canonical timings synced');
}

async function ensureBillingTables() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS billing_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            meal_price NUMERIC(10, 2) NOT NULL DEFAULT 100,
            reward_discount_per_meal NUMERIC(10, 2) NOT NULL DEFAULT 10,
            penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 50,
            penalty_skip_threshold INTEGER NOT NULL DEFAULT 4,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by UUID REFERENCES user_profiles(id)
        )`
    );

    await pool.query(
        `INSERT INTO billing_settings (id, meal_price, reward_discount_per_meal, penalty_amount, penalty_skip_threshold)
         VALUES (1, $1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [DEFAULT_MEAL_BASE_FEE, REWARD_DISCOUNT_AMOUNT, DEFAULT_PENALTY_AMOUNT, PENALTY_SKIP_THRESHOLD]
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS monthly_billing (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            billing_month VARCHAR(7) NOT NULL,
            total_meals INTEGER NOT NULL DEFAULT 0,
            attended_meals INTEGER NOT NULL DEFAULT 0,
            skipped_meals INTEGER NOT NULL DEFAULT 0,
            base_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            rewards NUMERIC(10, 2) NOT NULL DEFAULT 0,
            penalty_count INTEGER NOT NULL DEFAULT 0,
            penalties NUMERIC(10, 2) NOT NULL DEFAULT 0,
            final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
            paid_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, billing_month)
        )`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            billing_id UUID REFERENCES monthly_billing(id) ON DELETE SET NULL,
            amount NUMERIC(10, 2) NOT NULL,
            payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            payment_method VARCHAR(50) NOT NULL DEFAULT 'demo_gateway',
            transaction_id TEXT NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL DEFAULT 'paid',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
    );

    await pool.query('CREATE INDEX IF NOT EXISTS idx_monthly_billing_month_status ON monthly_billing(billing_month, payment_status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date DESC)');
}

async function getBillingSettings(client = pool) {
    const settingsRes = await client.query(
        `SELECT meal_price, reward_discount_per_meal, penalty_amount, penalty_skip_threshold
         FROM billing_settings
         WHERE id = 1`
    );

    const row = settingsRes.rows[0] || {};
    return {
        meal_price: toNumber(row.meal_price, DEFAULT_MEAL_BASE_FEE),
        reward_discount_per_meal: toNumber(row.reward_discount_per_meal, REWARD_DISCOUNT_AMOUNT),
        penalty_amount: toNumber(row.penalty_amount, DEFAULT_PENALTY_AMOUNT),
        penalty_skip_threshold: Math.max(1, parseInt(row.penalty_skip_threshold || PENALTY_SKIP_THRESHOLD, 10))
    };
}

async function computeMonthlyBill(client, { userId, monthKey }) {
    const settings = await getBillingSettings(client);

    await syncSkippedBookings(client, { userId });

    const records = await queryMealRecords(client, { userId, monthKey });
    const totals = buildMealTotals(records);
    const totalMeals = totals.meals_booked;
    const attendedMeals = totals.meals_attended;
    const skippedMeals = totals.meals_skipped;
    const penaltyCount = Math.floor(skippedMeals / settings.penalty_skip_threshold);
    const baseAmount = Number((totalMeals * settings.meal_price).toFixed(2));
    const rewards = Number((attendedMeals * settings.reward_discount_per_meal).toFixed(2));
    const penalties = Number((penaltyCount * settings.penalty_amount).toFixed(2));
    const finalAmount = Number((baseAmount - rewards + penalties).toFixed(2));

    return {
        month: monthKey,
        total_meals: totalMeals,
        attended_meals: attendedMeals,
        skipped_meals: skippedMeals,
        base_amount: baseAmount,
        rewards,
        penalty_count: penaltyCount,
        penalties,
        final_amount: finalAmount,
        settings
    };
}

async function upsertMonthlyBill(client, { userId, monthKey }) {
    const computed = await computeMonthlyBill(client, { userId, monthKey });
    const existingRes = await client.query(
        `SELECT id, payment_status, paid_at
         FROM monthly_billing
         WHERE user_id = $1 AND billing_month = $2`,
        [userId, monthKey]
    );
    const existing = existingRes.rows[0];

    const upsertRes = await client.query(
        `INSERT INTO monthly_billing (
            user_id, billing_month, total_meals, attended_meals, skipped_meals,
            base_amount, rewards, penalty_count, penalties, final_amount,
            payment_status, paid_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'unpaid'), $12, NOW())
         ON CONFLICT (user_id, billing_month)
         DO UPDATE SET
            total_meals = EXCLUDED.total_meals,
            attended_meals = EXCLUDED.attended_meals,
            skipped_meals = EXCLUDED.skipped_meals,
            base_amount = EXCLUDED.base_amount,
            rewards = EXCLUDED.rewards,
            penalty_count = EXCLUDED.penalty_count,
            penalties = EXCLUDED.penalties,
            final_amount = EXCLUDED.final_amount,
            payment_status = COALESCE(monthly_billing.payment_status, EXCLUDED.payment_status),
            paid_at = monthly_billing.paid_at,
            updated_at = NOW()
         RETURNING *`,
        [
            userId,
            monthKey,
            computed.total_meals,
            computed.attended_meals,
            computed.skipped_meals,
            computed.base_amount,
            computed.rewards,
            computed.penalty_count,
            computed.penalties,
            computed.final_amount,
            existing?.payment_status || 'unpaid',
            existing?.paid_at || null
        ]
    );

    return {
        ...upsertRes.rows[0],
        settings: computed.settings
    };
}

async function ensureWastageConstraints() {
    await pool.query("ALTER TABLE wastage_logs ADD COLUMN IF NOT EXISTS item_name VARCHAR(100)");
    await pool.query("UPDATE wastage_logs SET item_name = COALESCE(NULLIF(item_name, ''), food_category, 'General') WHERE item_name IS NULL OR item_name = ''");
    await pool.query("ALTER TABLE wastage_logs ALTER COLUMN item_name SET NOT NULL");
    await pool.query("ALTER TABLE wastage_logs ALTER COLUMN quantity_wasted SET NOT NULL");
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_wastage_logs_date_meal_item ON wastage_logs(date, meal_type, item_name)');
}

// ─── Auto-Meal Generation ───────────────────────────────────────────────────
// Ensures breakfast, lunch, and dinner entries exist for a given date.
// If any are missing, they are created with canonical timings and default capacity.
async function ensureMealsForDate(clientOrPool, date) {
    const normalizedDate = normalizeDateInput(date);
    if (!normalizedDate) return [];

    const existingRes = await clientOrPool.query(
        'SELECT meal_type FROM meals WHERE date = $1',
        [normalizedDate]
    );
    const existingTypes = new Set(existingRes.rows.map(r => r.meal_type));

    for (const mealType of MEAL_ORDER) {
        if (existingTypes.has(mealType)) continue;

        const timing = getMealTimingForType(mealType);
        if (!timing) continue;

        const startTime = toDbTime(timing.start);
        const endTime = toDbTime(timing.end);
        const bookingDeadline = `${normalizedDate}T${timing.start}:00+05:30`;
        const cancellationDeadline = `${normalizedDate}T${timing.start}:00+05:30`;

        await clientOrPool.query(
            `INSERT INTO meals (id, meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, max_capacity, is_active)
             VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 200, true)
             ON CONFLICT (meal_type, date) DO NOTHING`,
            [mealType, normalizedDate, startTime, endTime, bookingDeadline, cancellationDeadline]
        );
    }

    const allMeals = await clientOrPool.query(
        'SELECT * FROM meals WHERE date = $1 ORDER BY start_time ASC',
        [normalizedDate]
    );
    return allMeals.rows;
}

async function ensureAnonymousFeedbackTable() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS feedback (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            message TEXT NOT NULL,
            rating INTEGER CHECK (rating BETWEEN 1 AND 5),
            meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_anonymous BOOLEAN NOT NULL DEFAULT true
        )`
    );
    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'meal_feedback'
            ) THEN
                INSERT INTO feedback (id, message, rating, meal_type, created_at, is_anonymous)
                SELECT
                    mf.id,
                    COALESCE(NULLIF(BTRIM(mf.comment), ''), 'Legacy feedback migrated from meal_feedback'),
                    mf.rating,
                    mf.meal_type,
                    COALESCE(mf.created_at, NOW()),
                    TRUE
                FROM meal_feedback mf
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM feedback f
                    WHERE f.id = mf.id
                );
            END IF;
        END $$;
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feedback_meal_type ON feedback(meal_type)');
}

// Test DB connection on startup
pool.query('SELECT NOW()')
    .then(async () => {
        await ensureMenuVotingTable();
        await ensureAttendanceTables();
        await ensureBillingTables();
        await ensureAnonymousFeedbackTable();
        await ensureWastageConstraints();
        console.log('✅ Database connected');
    })
    .catch(err => console.error('❌ Database connection failed:', err.message));

app.use(express.json());
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        const statusCode = res.statusCode || 200;
        const isObjectPayload =
            payload &&
            typeof payload === 'object' &&
            !Array.isArray(payload);

        if (statusCode >= 400) {
            const message = isObjectPayload
                ? payload.message || payload.error || GENERIC_ERROR_MESSAGE
                : GENERIC_ERROR_MESSAGE;

            const normalizedPayload = isObjectPayload
                ? {
                    ...payload,
                    success: false,
                    message
                }
                : {
                    success: false,
                    message
                };

            if ('error' in normalizedPayload) {
                delete normalizedPayload.error;
            }

            return originalJson(normalizedPayload);
        }

        return originalJson(payload);
    };

    next();
});
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is running'
    })
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        ok: true,
        message: 'API is healthy'
    });
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
        pool.query("SELECT COUNT(*)::int AS meals_served_today FROM meal_bookings WHERE booking_date = CURRENT_DATE AND status IN ('booked', 'attended', 'skipped')"),
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

// GET /api/login - Manual route check
app.get('/api/login', (req, res) => {
    res.json({
        message: 'Login endpoint is reachable. Use POST /api/login to authenticate.'
    });
});

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
            "   WHERE mb.status IN ('booked', 'attended', 'skipped') AND m.date = CURRENT_DATE " +
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

// GET /api/meals?date=YYYY-MM-DD&type=breakfast
app.get('/api/meals', async (req, res) => {
    try {
        const date = normalizeDateInput(req.query.date);
        if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });

        const type = normalizeMealType(req.query.type);

        // Auto-create meals if none exist for this date
        await ensureMealsForDate(pool, date);

        let query = `
            SELECT m.*,
                COALESCE((SELECT COUNT(*) FROM meal_bookings mb WHERE mb.meal_id = m.id AND mb.status IN ('booked', 'attended', 'skipped')), 0)::int AS booked_count
            FROM meals m
            WHERE m.date = $1
        `;
        const params = [date];

        if (type) {
            query += ' AND m.meal_type = $2';
            params.push(type);
        }

        query += ' ORDER BY m.start_time ASC';

        const result = await pool.query(query, params);
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
        console.error('Meals fetch error:', error);
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

async function generateAttendanceQrResponse({ mealType, date }) {
    const normalizedMealType = normalizeMealType(mealType);
    const normalizedDate = normalizeDateInput(date, getISTNow().dateString);

    if (!normalizedMealType) {
        throw new Error('Valid meal type is required');
    }

    let mealRes = await pool.query(
        `SELECT id, meal_type, date, start_time, end_time
         FROM meals
         WHERE meal_type = $1 AND date = $2
         ORDER BY start_time ASC
         LIMIT 1`,
        [normalizedMealType, normalizedDate]
    );

    if (mealRes.rows.length === 0) {
        // Auto-create meals for this date instead of returning 404
        await ensureMealsForDate(pool, normalizedDate);
        mealRes = await pool.query(
            `SELECT id, meal_type, date, start_time, end_time
             FROM meals
             WHERE meal_type = $1 AND date = $2
             ORDER BY start_time ASC
             LIMIT 1`,
            [normalizedMealType, normalizedDate]
        );
        if (mealRes.rows.length === 0) {
            const error = new Error('Failed to create meal entry');
            error.status = 500;
            throw error;
        }
    }

    const meal = mealRes.rows[0];
    const canonicalTiming = getMealTimingForType(normalizedMealType);
    const start = canonicalTiming?.start || String(meal.start_time || '').slice(0, 5);
    const end = canonicalTiming?.end || String(meal.end_time || '').slice(0, 5);
    const expiresAt = new Date(`${normalizedDate}T${end}:00+05:30`).toISOString();
    const qrPayload = buildAttendanceQrPayload({
        mealType: normalizedMealType,
        date: normalizedDate,
        expiresAt
    });
    const qrImage = await QRCode.toDataURL(qrPayload, { width: 512, margin: 2 });
    const currentIst = getISTNow();

    return {
        meal_id: meal.id,
        meal_type: normalizedMealType,
        date: normalizedDate,
        expires_at: expiresAt,
        qr_payload: qrPayload,
        qr_image: qrImage,
        status: currentIst.dateString === normalizedDate && isWithinMealTime(start, end).within ? 'active' : 'scheduled',
        timing: {
            start,
            end,
            start_display: formatTime12h(start),
            end_display: formatTime12h(end)
        }
    };
}

app.post('/api/generate-qr', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const response = await generateAttendanceQrResponse({
            mealType: req.body?.meal_type,
            date: req.body?.date
        });
        return res.json(response);
    } catch (error) {
        console.error('Generate QR error:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to generate QR' });
    }
});

app.get('/api/generate-qr/:mealId', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const mealId = String(req.params.mealId || '').trim();
        if (!mealId) {
            return res.status(400).json({ error: 'mealId is required' });
        }

        const mealRes = await pool.query(
            "SELECT meal_type, date FROM meals WHERE id = $1 LIMIT 1",
            [mealId]
        );

        if (mealRes.rows.length === 0) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        const response = await generateAttendanceQrResponse({
            mealType: mealRes.rows[0].meal_type,
            date: mealRes.rows[0].date
        });
        return res.json(response);
    } catch (error) {
        console.error('Generate QR error:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to generate QR' });
    }
});

async function handleAttendanceScan(req, res) {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const body = req.body || {};
        const parsedQrData = parseAttendanceQrPayload(body.qr_data);
        const scannedMealType = parsedQrData.mealType || normalizeMealType(body.meal_type);
        const scannedDate = normalizeDateInput(parsedQrData.date, getISTNow().dateString);
        const scannedExpiresAt = String(parsedQrData.expiresAt || '').trim();

        if (!scannedMealType) {
            return res.status(400).json({ error: 'Invalid QR code' });
        }

        if (scannedDate !== getISTNow().dateString) {
            return res.status(400).json({ error: 'QR code is not valid for today' });
        }

        if (scannedExpiresAt && Date.now() > Date.parse(scannedExpiresAt)) {
            return res.status(400).json({ error: 'QR code has expired' });
        }

        let mealRes = await client.query(
            `SELECT id, date, meal_type, start_time, end_time
             FROM meals
             WHERE meal_type = $1 AND date = $2
             ORDER BY start_time ASC
             LIMIT 1`,
            [scannedMealType, scannedDate]
        );
        if (mealRes.rows.length === 0) {
            // Auto-create meals for this date instead of returning 404
            await ensureMealsForDate(client, scannedDate);
            mealRes = await client.query(
                `SELECT id, date, meal_type, start_time, end_time
                 FROM meals
                 WHERE meal_type = $1 AND date = $2
                 ORDER BY start_time ASC
                 LIMIT 1`,
                [scannedMealType, scannedDate]
            );
            if (mealRes.rows.length === 0) {
                return res.status(500).json({ error: 'Failed to create meal entry' });
            }
        }

        const meal = mealRes.rows[0];
        const mealType = normalizeMealType(meal.meal_type) || scannedMealType;
        const canonicalTiming = getMealTimingForType(mealType) || getMealTimingForType(scannedMealType);
        const startTime = canonicalTiming?.start || String(meal.start_time || '').slice(0, 5);
        const endTime = canonicalTiming?.end || String(meal.end_time || '').slice(0, 5);

        const timeCheck = isWithinMealTime(startTime, endTime);
        if (!timeCheck.within) {
            return res.status(400).json({
                error: 'Scans are allowed only during the meal window',
                detail: `Attendance is allowed from ${formatTime12h(startTime)} to ${formatTime12h(endTime)} IST`,
                allowed_window: { start: startTime, end: endTime },
                current_time_ist: timeCheck.currentTime
            });
        }

        await client.query('BEGIN');
        transactionStarted = true;
        await syncSkippedBookings(client, { userId: req.user.id });

        const bookingRes = await client.query(
            `SELECT id, status, booking_date, original_price, discounted_price, reward_applied, attendance_status, qr_token
             FROM meal_bookings
             WHERE user_id = $1 AND meal_id = $2
             LIMIT 1`,
            [req.user.id, meal.id]
        );

        if (bookingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({ error: 'Meal must be booked before attendance can be marked' });
        }

        const booking = bookingRes.rows[0];
        if (booking.attendance_status === 'present') {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({ error: 'Attendance already marked' });
        }

        if (booking.attendance_status === 'absent') {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({ error: 'Meal attendance window already closed for this booking' });
        }

        await client.query(
            `INSERT INTO student_rewards (user_id, points, total_meals, last_updated)
             VALUES ($1, 10, 1, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
                points = student_rewards.points + 10,
                total_meals = student_rewards.total_meals + 1,
                total_rewards = student_rewards.total_rewards + 1,
                penalty_status = CASE
                    WHEN student_rewards.penalty_status = 'warning' THEN 'clear'
                    ELSE student_rewards.penalty_status
                END,
                last_updated = NOW()
             RETURNING points, total_meals, total_rewards, skipped_meals_count, penalty_status, total_penalties, penalty_note`,
            [req.user.id]
        );

        await client.query(
            `UPDATE meal_bookings
             SET checked_in_at = COALESCE(checked_in_at, NOW()),
                 status = 'attended',
                 attendance_status = 'present',
                 discounted_price = $3,
                 reward_applied = true,
                 updated_at = NOW()
             WHERE user_id = $1 AND meal_id = $2`,
            [req.user.id, meal.id, REWARDED_MEAL_FEE]
        );

        const rewardsRes = await client.query(
            `SELECT points, total_meals, total_rewards, skipped_meals_count, penalty_status, total_penalties, penalty_note
             FROM student_rewards WHERE user_id = $1`,
            [req.user.id]
        );
        const rewards = rewardsRes.rows[0] || {
            points: 0,
            total_meals: 0,
            total_rewards: 0,
            skipped_meals_count: 0,
            penalty_status: 'clear',
            total_penalties: 0,
            penalty_note: ''
        };

        await client.query('COMMIT');
        transactionStarted = false;
        return res.json({
            message: 'Attendance successfully recorded',
            attendance_status: 'present',
            scanned_at: new Date().toISOString(),
            meal_type: mealType,
            date: meal.date,
            rewards: {
                points: Number(rewards.points) || 0,
                total_meals: Number(rewards.total_meals) || 0,
                total_rewards: Number(rewards.total_rewards) || 0
            },
            penalty: {
                skipped_meals_count: Number(rewards.skipped_meals_count) || 0,
                penalty_status: normalizePenaltyStatus(rewards.penalty_status),
                total_penalties: Number(rewards.total_penalties) || 0,
                note: rewards.penalty_note || ''
            }
            ,
            fee_preview: buildFeePreview({ rewardApplied: true })
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
}

// GET /api/attendance - Role-aware attendance access
app.get('/api/attendance', authMiddleware, async (req, res) => {
    try {
        const userRole = normalizeRole(req.user?.role);
        const queryDate = normalizeDateInput(req.query.date, getISTNow().dateString);
        const mealType = normalizeMealType(req.query.meal_type);
        const requestedStatus = normalizeAttendanceStatus(req.query.status);
        const status = requestedStatus && requestedStatus !== 'all' ? requestedStatus : '';

        if (req.query.date && !queryDate) {
            return res.status(400).json({ error: 'Invalid date. Expected YYYY-MM-DD' });
        }

        if (req.query.meal_type && !mealType) {
            return res.status(400).json({ error: 'Invalid meal type. Use breakfast, lunch, or dinner' });
        }

        if (req.query.status && !requestedStatus) {
            return res.status(400).json({ error: 'Invalid status. Use present, absent, or all' });
        }

        await syncSkippedBookings(pool, {
            userId: isAttendanceViewer(userRole) ? '' : req.user.id,
            bookingDate: queryDate,
            mealType
        });

        let records = await queryMealRecords(pool, {
            date: queryDate,
            mealType,
            userId: isAttendanceViewer(userRole) ? '' : req.user.id
        });

        if (status === 'present') {
            records = records.filter((record) => record.attendance_status === 'present');
        }

        if (status === 'absent') {
            records = records.filter((record) => ['pending', 'absent'].includes(record.attendance_status));
        }

        const buckets = buildAttendanceBuckets(records);
        const totals = buildMealTotals(records);

        if (!isAttendanceViewer(userRole)) {
            return res.json({
                ...buckets,
                totals
            });
        }

        const analytics = MEAL_ORDER.map((meal) => {
            const mealRecords = records.filter((record) => record.meal_type === meal);
            const mealBuckets = buildAttendanceBuckets(mealRecords);
            return {
                meal_type: meal,
                total_present: mealBuckets.total_present,
                total_absent: mealBuckets.total_absent
            };
        });

        return res.json({
            total_present: buckets.total_present,
            total_absent: buckets.total_absent,
            date: queryDate,
            meal_type: mealType || null,
            records,
            students: buckets.present_users,
            present_users: buckets.present_users,
            absent_users: buckets.absent_users,
            totals,
            analytics
        });
    } catch (error) {
        console.error('Attendance listing error:', error);
        return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// GET /api/attendance/history - Get attendance history for current student
app.get('/api/attendance/history', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        await syncSkippedBookings(pool, { userId: req.user.id });
        const records = await queryMealRecords(pool, { userId: req.user.id });
        const history = records.map((row) => {
            const scannedAt = row.scanned_at ? new Date(row.scanned_at) : null;
            const istTimeStr = scannedAt
                ? scannedAt.toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false })
                : '';

            return {
                id: row.id,
                date: row.date,
                meal: String(row.meal_type || 'meal'),
                time: istTimeStr ? formatTime12h(istTimeStr) : 'Pending',
                status: row.attendance_status || 'pending',
                original_price: row.original_price,
                discounted_price: row.discounted_price,
                reward_applied: row.reward_applied
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
        await syncSkippedBookings(pool, { userId: req.user.id });
        const rewardsRes = await pool.query(
            `SELECT points, total_meals, total_rewards, skipped_meals_count, penalty_status, total_penalties, penalty_note
             FROM student_rewards WHERE user_id = $1`,
            [req.user.id]
        );
        const rewards = rewardsRes.rows[0] || {
            points: 0,
            total_meals: 0,
            total_rewards: 0,
            skipped_meals_count: 0,
            penalty_status: 'clear',
            total_penalties: 0,
            penalty_note: ''
        };
        const points = Number(rewards.points) || 0;

        return res.json({
            rewards: {
                points,
                total_meals: Number(rewards.total_meals) || 0,
                total_rewards: Number(rewards.total_rewards) || 0
            },
            penalty: {
                skipped_meals_count: Number(rewards.skipped_meals_count) || 0,
                penalty_status: normalizePenaltyStatus(rewards.penalty_status),
                total_penalties: Number(rewards.total_penalties) || 0,
                note: rewards.penalty_note || ''
            }
            ,
            fee_preview: buildFeePreview({ rewardApplied: true })
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

async function upsertWeekMenuEntry(client, { date, mealType, startTime, endTime, items, actorId }) {
    const upsertMeal = await client.query(
        "INSERT INTO meals (id, meal_type, date, start_time, end_time, booking_deadline, cancellation_deadline, is_active, created_by) " +
        "VALUES (uuid_generate_v4(), $1, $2, $3, $4, ($2::date - INTERVAL '1 day') + $3::time, ($2::date - INTERVAL '1 day') + $3::time, true, $5) " +
        "ON CONFLICT (meal_type, date) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, updated_at = NOW() " +
        "RETURNING id",
        [mealType, date, startTime, endTime, actorId]
    );
    const mealId = upsertMeal.rows[0].id;

    await client.query("DELETE FROM meal_menus WHERE meal_id = $1", [mealId]);
    const parsedItems = Array.isArray(items)
        ? items
        : String(items || '').split(',').map((item) => item.trim()).filter(Boolean);

    for (let i = 0; i < parsedItems.length; i += 1) {
        await client.query(
            "INSERT INTO meal_menus (id, meal_id, item_name, sort_order) VALUES (uuid_generate_v4(), $1, $2, $3)",
            [mealId, parsedItems[i], i]
        );
    }

    return mealId;
}

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
        const mealId = await upsertWeekMenuEntry(client, {
            date,
            mealType: meal_type,
            startTime: start_time,
            endTime: end_time,
            items,
            actorId: req.user.id
        });
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
        await syncSkippedBookings(pool, { userId: req.user.id, bookingDate: date });

        const result = await pool.query(
            `SELECT meal_id, status, original_price, discounted_price, reward_applied, attendance_status, qr_token
             FROM meal_bookings
             WHERE user_id = $1 AND booking_date = $2`,
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
        await syncSkippedBookings(pool, { userId: req.user.id });
        const result = await pool.query(
            `SELECT mb.id, mb.status, mb.is_auto_booked, mb.booking_date,
                    m.meal_type, m.start_time, mb.original_price, mb.discounted_price,
                    mb.reward_applied, mb.attendance_status, mb.qr_token
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
        const mealRes = await pool.query(
            'SELECT id, meal_type, date FROM meals WHERE id = $1 LIMIT 1',
            [meal_id]
        );

        if (mealRes.rows.length === 0) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        const meal = mealRes.rows[0];
        const qrToken = buildBookingQrToken({
            userId: req.user.id,
            mealId: meal_id,
            bookingDate: booking_date || meal.date,
            mealType: meal.meal_type
        });
        const result = await pool.query(
            `INSERT INTO meal_bookings (
                user_id, meal_id, booking_date, status, original_price, discounted_price,
                reward_applied, attendance_status, qr_token
             )
             VALUES ($1, $2, $3, 'booked', $4, $4, false, 'pending', $5)
             RETURNING id, original_price, discounted_price, reward_applied, attendance_status, qr_token`,
            [req.user.id, meal_id, booking_date, DEFAULT_MEAL_BASE_FEE, qrToken]
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

// POST /api/book — simplified booking endpoint accepting { date, meal_type }
app.post('/api/book', authMiddleware, async (req, res) => {
    try {
        const date = normalizeDateInput(req.body?.date);
        const mealType = normalizeMealType(req.body?.meal_type);

        if (!date || !mealType) {
            return res.status(400).json({ error: 'date (YYYY-MM-DD) and meal_type (breakfast/lunch/dinner) are required' });
        }

        // Ensure the meal exists (auto-create if missing)
        await ensureMealsForDate(pool, date);

        const mealRes = await pool.query(
            'SELECT id, meal_type, date FROM meals WHERE meal_type = $1 AND date = $2 LIMIT 1',
            [mealType, date]
        );

        if (mealRes.rows.length === 0) {
            return res.status(500).json({ error: 'Failed to find or create meal' });
        }

        const meal = mealRes.rows[0];
        const qrToken = buildBookingQrToken({
            userId: req.user.id,
            mealId: meal.id,
            bookingDate: date,
            mealType: mealType
        });

        const result = await pool.query(
            `INSERT INTO meal_bookings (
                user_id, meal_id, booking_date, status, original_price, discounted_price,
                reward_applied, attendance_status, qr_token
             )
             VALUES ($1, $2, $3, 'booked', $4, $4, false, 'pending', $5)
             RETURNING id, meal_id, original_price, discounted_price, reward_applied, attendance_status, qr_token`,
            [req.user.id, meal.id, date, DEFAULT_MEAL_BASE_FEE, qrToken]
        );

        // Increment booked_count is implicit (counted via meal_bookings subquery)
        res.status(201).json({
            ...result.rows[0],
            meal_type: mealType,
            date: date
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Booking already exists for this meal' });
        }
        console.error('Book error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/feedback — save or update feedback (upsert)
app.post('/api/feedback', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const message = String(req.body?.message || '').trim();
        const meal_type = normalizeMealType(req.body?.meal_type);
        const hasRating = req.body?.rating !== undefined && req.body?.rating !== null && String(req.body?.rating).trim() !== '';
        const rating = hasRating ? parseInt(req.body.rating, 10) : null;

        if (!message) return res.status(400).json({ error: 'Feedback message is required' });
        if (message.length > 300) return res.status(400).json({ error: 'Feedback message exceeds 300 characters' });
        if (!meal_type) return res.status(400).json({ error: 'Valid meal type is required' });
        if (hasRating && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const result = await pool.query(
            `INSERT INTO feedback (message, rating, meal_type, created_at, is_anonymous)
             VALUES ($1, $2, $3, NOW(), TRUE)
             RETURNING id, message, rating, meal_type, created_at, is_anonymous`,
            [message, rating, meal_type]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: error.message || 'Failed to save feedback' });
    }
});

// GET /api/feedback — fetch feedback with filters
app.get('/api/feedback', authMiddleware, requireRole(['mess_manager', 'chef', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const meal_type = normalizeMealType(req.query.meal_type);
        const date = normalizeDateInput(req.query.date);
        const rating = req.query.rating ? parseInt(req.query.rating, 10) : null;
        const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

        let query = `
            SELECT id, message, rating, meal_type, created_at, is_anonymous
            FROM feedback
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (meal_type) { query += ` AND meal_type = $${paramIndex++}`; params.push(meal_type); }
        if (date) { query += ` AND DATE(created_at) = $${paramIndex++}`; params.push(date); }
        if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
            query += ` AND rating = $${paramIndex++}`;
            params.push(rating);
        }

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM (${query}) AS filtered_feedback`,
            params
        );

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({ success: true, data: result.rows, count: countResult.rows[0]?.count || 0 });
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
    console.log('Route hit:', req.url);
    try {
        const result = await pool.query(
            `SELECT m.*, 
                (SELECT COUNT(*) FROM meal_bookings mb WHERE mb.meal_id = m.id AND mb.status IN ('booked', 'attended', 'skipped')) as booked_count
             FROM meals m 
             WHERE m.date = CURRENT_DATE
             ORDER BY m.start_time ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Chef menu error:', error);
        if (isPgOptionalDataError(error)) {
            return res.json([]);
        }
        res.status(500).json({ error: error.message || 'Failed to fetch chef menu' });
    }
});

app.get('/api/billing/summary', authMiddleware, requireRole(['student']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());
        const billing = await upsertMonthlyBill(client, { userId: req.user.id, monthKey });
        const paymentsRes = await client.query(
            `SELECT amount, payment_date, payment_method, transaction_id, status
             FROM payments
             WHERE user_id = $1
             ORDER BY payment_date DESC
             LIMIT 12`,
            [req.user.id]
        );

        return res.json({
            billing,
            monthly_breakdown: {
                total_meals_booked: Number(billing.total_meals) || 0,
                total_meals_attended: Number(billing.attended_meals) || 0,
                total_meals_skipped: Number(billing.skipped_meals) || 0,
                base_cost: toNumber(billing.base_amount, 0),
                total_rewards: toNumber(billing.rewards, 0),
                penalty_count: Number(billing.penalty_count) || 0,
                total_penalty_amount: toNumber(billing.penalties, 0),
                final_amount: toNumber(billing.final_amount, 0),
                payment_status: billing.payment_status || 'unpaid'
            },
            payments: paymentsRes.rows
        });
    } catch (error) {
        console.error('Billing summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing summary' });
    } finally {
        client.release();
    }
});

app.post('/api/attendance', authMiddleware, requireRole(['student']), handleAttendanceScan);
app.post('/api/scan-qr', authMiddleware, requireRole(['student']), handleAttendanceScan);

app.post('/api/billing/pay', authMiddleware, requireRole(['student']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.body?.month, getCurrentMonthKey());
        await client.query('BEGIN');
        const billing = await upsertMonthlyBill(client, { userId: req.user.id, monthKey });

        if ((billing.payment_status || 'unpaid') === 'paid') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'This bill is already marked as paid' });
        }

        const transactionId = `DEMO-${Date.now()}-${String(req.user.id).slice(0, 8)}`;
        await client.query(
            `UPDATE monthly_billing
             SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [billing.id]
        );
        await client.query(
            `INSERT INTO payments (user_id, billing_id, amount, payment_method, transaction_id, status)
             VALUES ($1, $2, $3, $4, $5, 'paid')`,
            [req.user.id, billing.id, billing.final_amount, 'demo_gateway', transactionId]
        );
        await client.query('COMMIT');

        return res.json({
            message: 'Payment recorded successfully',
            transaction_id: transactionId,
            payment_status: 'paid'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Billing pay error:', error);
        return res.status(500).json({ error: 'Failed to record payment' });
    } finally {
        client.release();
    }
});

async function getAllUsersBilling(client, { monthKey, paymentStatus = 'all', hostelId = '', block = '' } = {}) {
    const settings = await getBillingSettings(client);
    const studentsRes = await client.query(
        `SELECT up.id, up.full_name AS student_name, up.email, up.room_number, h.name AS hostel_name, up.hostel_id
         FROM user_profiles up
         JOIN roles r ON up.role_id = r.id
         LEFT JOIN hostels h ON h.id = up.hostel_id
         WHERE up.is_active = true
           AND LOWER(r.name) = 'student'
           ${hostelId ? 'AND up.hostel_id = $1' : ''}
         ORDER BY up.full_name ASC`,
        hostelId ? [hostelId] : []
    );

    const billingRows = [];
    for (const student of studentsRes.rows) {
        if (block && !String(student.room_number || '').toLowerCase().startsWith(String(block).toLowerCase())) {
            continue;
        }

        const bill = await upsertMonthlyBill(client, { userId: student.id, monthKey });
        const billingRow = {
            user_id: student.id,
            student_name: student.student_name,
            email: student.email || '',
            hostel_name: student.hostel_name || 'Unassigned',
            block: student.room_number ? String(student.room_number).charAt(0).toUpperCase() : 'NA',
            total_booked_meals: Number(bill.total_meals) || 0,
            attended_meals: Number(bill.attended_meals) || 0,
            skipped_meals: Number(bill.skipped_meals) || 0,
            rewards: toNumber(bill.rewards, 0),
            penalties: toNumber(bill.penalties, 0),
            penalty_count: Number(bill.penalty_count) || 0,
            final_amount: toNumber(bill.final_amount, 0),
            payment_status: bill.payment_status || 'unpaid',
            base_amount: toNumber(bill.base_amount, 0)
        };

        if (paymentStatus !== 'all' && billingRow.payment_status !== paymentStatus) {
            continue;
        }

        billingRows.push(billingRow);
    }

    const overview = billingRows.reduce((acc, row) => {
        acc.total_students += 1;
        acc.total_meals_booked += row.total_booked_meals;
        acc.total_attended += row.attended_meals;
        acc.total_skipped += row.skipped_meals;
        acc.total_rewards_given += row.rewards;
        acc.total_penalties_collected += row.penalties;
        acc.total_revenue_expected += row.final_amount;
        return acc;
    }, {
        total_students: 0,
        total_meals_booked: 0,
        total_attended: 0,
        total_skipped: 0,
        total_rewards_given: 0,
        total_penalties_collected: 0,
        total_revenue_expected: 0
    });

    return {
        month: monthKey,
        settings,
        overview,
        billing_rows: billingRows
    };
}

app.get('/api/billing/all-users', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());
        const paymentStatus = String(req.query.payment_status || 'all').trim().toLowerCase();
        const hostelId = String(req.query.hostel_id || '').trim();
        const block = String(req.query.block || '').trim().toLowerCase();
        const payload = await getAllUsersBilling(client, { monthKey, paymentStatus, hostelId, block });
        return res.json(payload);
    } catch (error) {
        console.error('Mess manager billing error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing dashboard' });
    } finally {
        client.release();
    }
});

app.get('/api/mess-manager/billing', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());
        const paymentStatus = String(req.query.payment_status || 'all').trim().toLowerCase();
        const hostelId = String(req.query.hostel_id || '').trim();
        const block = String(req.query.block || '').trim().toLowerCase();
        const payload = await getAllUsersBilling(client, { monthKey, paymentStatus, hostelId, block });
        return res.json(payload);
    } catch (error) {
        console.error('Mess manager billing error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing dashboard' });
    } finally {
        client.release();
    }
});

app.get('/api/billing/user/:id', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin', 'student']), async (req, res) => {
    const client = await pool.connect();
    try {
        const requestedUserId = normalizeRole(req.user?.role) === 'student' ? req.user.id : String(req.params.id || '').trim();
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());

        if (!requestedUserId) {
            return res.status(400).json({ error: 'User id is required' });
        }

        const bill = await upsertMonthlyBill(client, { userId: requestedUserId, monthKey });
        const userRes = await client.query(
            `SELECT up.id, up.full_name AS student_name, up.email, up.room_number, h.name AS hostel_name
             FROM user_profiles up
             LEFT JOIN hostels h ON h.id = up.hostel_id
             WHERE up.id = $1
             LIMIT 1`,
            [requestedUserId]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const user = userRes.rows[0];
        return res.json({
            user_id: requestedUserId,
            student_name: user.student_name || 'Student',
            email: user.email || '',
            hostel_name: user.hostel_name || 'Unassigned',
            block: user.room_number ? String(user.room_number).charAt(0).toUpperCase() : 'NA',
            total_booked_meals: Number(bill.total_meals) || 0,
            attended_meals: Number(bill.attended_meals) || 0,
            skipped_meals: Number(bill.skipped_meals) || 0,
            rewards: toNumber(bill.rewards, 0),
            penalties: toNumber(bill.penalties, 0),
            penalty_count: Number(bill.penalty_count) || 0,
            final_amount: toNumber(bill.final_amount, 0),
            payment_status: bill.payment_status || 'unpaid',
            base_amount: toNumber(bill.base_amount, 0)
        });
    } catch (error) {
        console.error('Billing user error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing details' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/billing/analytics', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());
        const settings = await getBillingSettings(client);
        const studentsRes = await client.query(
            `SELECT up.id, up.full_name AS name, up.email, up.hostel_id, h.name AS hostel_name
             FROM user_profiles up
             JOIN roles r ON up.role_id = r.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE up.is_active = true AND LOWER(r.name) = 'student'
             ORDER BY up.full_name ASC`
        );

        const bills = [];
        for (const student of studentsRes.rows) {
            const bill = await upsertMonthlyBill(client, { userId: student.id, monthKey });
            bills.push({
                ...bill,
                name: student.name,
                email: student.email,
                hostel_name: student.hostel_name || 'Unassigned'
            });
        }

        const totalMonthlyRevenue = bills.reduce((sum, bill) => sum + toNumber(bill.final_amount, 0), 0);
        const pendingPayments = bills.filter((bill) => bill.payment_status !== 'paid').reduce((sum, bill) => sum + toNumber(bill.final_amount, 0), 0);
        const paidCount = bills.filter((bill) => bill.payment_status === 'paid').length;
        const collectionRate = bills.length > 0 ? Number(((paidCount / bills.length) * 100).toFixed(1)) : 0;

        const topDefaulters = bills
            .filter((bill) => bill.payment_status !== 'paid')
            .sort((a, b) => toNumber(b.final_amount, 0) - toNumber(a.final_amount, 0))
            .slice(0, 10);

        const highPenaltyUsers = [...bills]
            .sort((a, b) => (Number(b.penalty_count) || 0) - (Number(a.penalty_count) || 0))
            .slice(0, 10);

        return res.json({
            month: monthKey,
            overview: {
                total_monthly_revenue: Number(totalMonthlyRevenue.toFixed(2)),
                pending_payments: Number(pendingPayments.toFixed(2)),
                collection_rate: collectionRate,
                total_students: bills.length
            },
            settings,
            top_defaulters: topDefaulters,
            high_penalty_users: highPenaltyUsers,
            billing_history: bills
        });
    } catch (error) {
        console.error('Admin billing analytics error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing analytics' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/billing/export', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const monthKey = normalizeMonthInput(req.query.month, getCurrentMonthKey());
        const analytics = [];
        const studentsRes = await client.query(
            `SELECT up.id, up.full_name AS name, up.email, h.name AS hostel_name
             FROM user_profiles up
             JOIN roles r ON up.role_id = r.id
             LEFT JOIN hostels h ON up.hostel_id = h.id
             WHERE up.is_active = true AND LOWER(r.name) = 'student'
             ORDER BY up.full_name ASC`
        );

        for (const student of studentsRes.rows) {
            const bill = await upsertMonthlyBill(client, { userId: student.id, monthKey });
            analytics.push({
                name: student.name,
                email: student.email,
                hostel_name: student.hostel_name || 'Unassigned',
                total_meals: bill.total_meals,
                attended_meals: bill.attended_meals,
                skipped_meals: bill.skipped_meals,
                base_amount: bill.base_amount,
                rewards: bill.rewards,
                penalty_count: bill.penalty_count,
                penalties: bill.penalties,
                final_amount: bill.final_amount,
                payment_status: bill.payment_status
            });
        }

        const csvRows = [[
            'Name', 'Email', 'Hostel', 'Total Meals', 'Attended Meals', 'Skipped Meals',
            'Base Amount', 'Rewards', 'Penalty Count', 'Penalties', 'Final Amount', 'Payment Status'
        ].join(',')];

        analytics.forEach((row) => {
            csvRows.push([
                `"${String(row.name).replace(/"/g, '""')}"`,
                `"${String(row.email || '').replace(/"/g, '""')}"`,
                `"${String(row.hostel_name || '').replace(/"/g, '""')}"`,
                row.total_meals,
                row.attended_meals,
                row.skipped_meals,
                toNumber(row.base_amount, 0).toFixed(2),
                toNumber(row.rewards, 0).toFixed(2),
                row.penalty_count,
                toNumber(row.penalties, 0).toFixed(2),
                toNumber(row.final_amount, 0).toFixed(2),
                row.payment_status
            ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="billing-${monthKey}.csv"`);
        return res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Billing export error:', error);
        return res.status(500).json({ error: 'Failed to export billing report' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/billing/settings', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    try {
        return res.json(await getBillingSettings(pool));
    } catch (error) {
        console.error('Billing settings fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing settings' });
    }
});

app.put('/api/admin/billing/settings', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    try {
        const mealPrice = Math.max(0, toNumber(req.body?.meal_price, DEFAULT_MEAL_BASE_FEE));
        const rewardDiscount = Math.max(0, toNumber(req.body?.reward_discount_per_meal, REWARD_DISCOUNT_AMOUNT));
        const penaltyAmount = Math.max(0, toNumber(req.body?.penalty_amount, DEFAULT_PENALTY_AMOUNT));
        const skipThreshold = Math.max(1, parseInt(req.body?.penalty_skip_threshold || PENALTY_SKIP_THRESHOLD, 10));

        await pool.query(
            `UPDATE billing_settings
             SET meal_price = $1,
                 reward_discount_per_meal = $2,
                 penalty_amount = $3,
                 penalty_skip_threshold = $4,
                 updated_at = NOW(),
                 updated_by = $5
             WHERE id = 1`,
            [mealPrice, rewardDiscount, penaltyAmount, skipThreshold, req.user.id]
        );

        return res.json({
            message: 'Billing settings updated',
            settings: await getBillingSettings(pool)
        });
    } catch (error) {
        console.error('Billing settings update error:', error);
        return res.status(500).json({ error: 'Failed to update billing settings' });
    }
});

// GET /api/chef/prediction — AI Waste Predictor
app.get('/api/chef/prediction', optionalAuth, async (req, res) => {
    console.log('Route hit:', req.url);
    try {
        const date = new Date().toISOString().split('T')[0];

        // Find today's meals
        const mealsRes = await pool.query(
            `SELECT m.id, m.meal_type, 
                (SELECT COUNT(*) FROM meal_bookings mb WHERE mb.meal_id = m.id AND mb.status IN ('booked', 'attended', 'skipped')) as booked_count
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
        if (isPgOptionalDataError(error)) {
            return res.json({ success: true, ai_prediction: [], date: new Date().toISOString().split('T')[0] });
        }
        res.status(500).json({ error: error.message || 'Failed to generate AI prediction' });
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
app.get('/api/wastage', authMiddleware, async (req, res) => {
    try {
        const queryDate = normalizeDateInput(req.query.date, getISTNow().dateString);
        const mealType = normalizeMealType(req.query.meal_type);
        const params = [];
        const filters = [];
        let index = 1;

        if (req.query.date && !queryDate) {
            return res.status(400).json({ error: 'Invalid date. Expected YYYY-MM-DD' });
        }

        if (req.query.meal_type && !mealType) {
            return res.status(400).json({ error: 'Invalid meal type. Use breakfast, lunch, or dinner' });
        }

        if (queryDate) {
            filters.push(`date = $${index++}`);
            params.push(queryDate);
        }

        if (mealType) {
            filters.push(`meal_type = $${index++}`);
            params.push(mealType);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const [logsRes, totalsRes] = await Promise.all([
            pool.query(
                `SELECT id, date, meal_type, item_name AS food_item, quantity_wasted AS quantity, notes, created_at
                 FROM wastage_logs
                 ${whereClause}
                 ORDER BY date DESC, meal_type ASC, item_name ASC`,
                params
            ),
            pool.query(
                `SELECT meal_type, ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS total_wastage
                 FROM wastage_logs
                 ${whereClause}
                 GROUP BY meal_type
                 ORDER BY meal_type`,
                params
            )
        ]);

        res.json({
            date: queryDate || null,
            meal_type: mealType || null,
            logs: logsRes.rows.map((row) => ({
                ...row,
                quantity: toNumber(row.quantity, 0)
            })),
            totals_by_meal: totalsRes.rows.map((row) => ({
                meal_type: row.meal_type,
                total_wastage: toNumber(row.total_wastage, 0)
            })),
            total_wastage: totalsRes.rows.reduce((sum, row) => sum + toNumber(row.total_wastage, 0), 0)
        });
    } catch (error) {
        console.error('Wastage fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch wastage logs' });
    }
});

app.post('/api/wastage', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const date = normalizeDateInput(req.body?.date, '');
        const mealType = normalizeMealType(req.body?.meal_type);
        const foodItem = String(req.body?.food_item || '').trim();
        const quantityWasted = toNumber(req.body?.quantity_wasted, NaN);

        if (!date || !mealType || !foodItem) {
            return res.status(400).json({ error: 'date, meal_type, and food_item are required' });
        }

        if (!Number.isFinite(quantityWasted) || quantityWasted < 0) {
            return res.status(400).json({ error: 'quantity_wasted must be a non-negative number' });
        }

        const mealRes = await pool.query(
            `SELECT id
             FROM meals
             WHERE date = $1 AND meal_type = $2
             ORDER BY start_time ASC
             LIMIT 1`,
            [date, mealType]
        );

        const result = await pool.query(
            `INSERT INTO wastage_logs (meal_id, date, meal_type, item_name, quantity_wasted, logged_by, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (date, meal_type, item_name)
             DO UPDATE SET
                quantity_wasted = EXCLUDED.quantity_wasted,
                meal_id = COALESCE(EXCLUDED.meal_id, wastage_logs.meal_id),
                logged_by = EXCLUDED.logged_by,
                notes = EXCLUDED.notes
             RETURNING id, date, meal_type, item_name AS food_item, quantity_wasted AS quantity`,
            [
                mealRes.rows[0]?.id || null,
                date,
                mealType,
                foodItem,
                quantityWasted,
                req.user.id,
                `Updated by ${req.user.email || 'manager'}`
            ]
        );

        const totalsRes = await pool.query(
            `SELECT meal_type, ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS total_wastage
             FROM wastage_logs
             WHERE date = $1
             GROUP BY meal_type
             ORDER BY meal_type`,
            [date]
        );

        res.json({
            message: 'Wastage updated successfully',
            entry: {
                ...result.rows[0],
                quantity: toNumber(result.rows[0]?.quantity, 0)
            },
            totals_by_meal: totalsRes.rows.map((row) => ({
                meal_type: row.meal_type,
                total_wastage: toNumber(row.total_wastage, 0)
            }))
        });
    } catch (error) {
        console.error('Wastage upsert error:', error);
        res.status(500).json({ error: 'Failed to update wastage log' });
    }
});

app.get('/api/chef/inventory', optionalAuth, async (req, res) => {
    console.log('Route hit:', req.url);
    try {
        const result = await pool.query('SELECT * FROM inventory ORDER BY status, item_name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Chef inventory error:', error);
        if (isPgOptionalDataError(error)) {
            return res.json([]);
        }
        res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
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
    console.log('Route hit:', req.url);
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
        if (isPgOptionalDataError(error)) {
            return res.json({
                weekly_waste: [],
                waste_by_meal: [],
                waste_trend: [],
                efficiency: {
                    total_prepared_kg: 0,
                    total_consumed_kg: 0,
                    total_wasted_kg: 0,
                    utilization_rate: 0,
                    waste_rate: 0
                }
            });
        }
        res.status(500).json({ error: error.message || 'Failed to fetch chef analytics' });
    }
});

// GET /api/chef/feedback - Recent student meal feedback for kitchen review
app.get('/api/chef/feedback', authMiddleware, requireRole(['chef', 'mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    console.log('Route hit:', req.url);
    try {
        const limit = Math.min(parseInt(req.query.limit || '8', 10), 30);
        const meal_type = normalizeMealType(req.query.meal_type);
        const date = normalizeDateInput(req.query.date);
        const filters = [];
        const params = [];
        let paramIndex = 1;

        if (meal_type) {
            filters.push(`meal_type = $${paramIndex++}`);
            params.push(meal_type);
        }
        if (date) {
            filters.push(`DATE(created_at) = $${paramIndex++}`);
            params.push(date);
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const [feedbackRes, summaryRes] = await Promise.all([
            pool.query(
                `SELECT id, meal_type, rating, message, created_at
                 FROM feedback
                 ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT $${paramIndex}`,
                [...params, limit]
            ),
            pool.query(
                "SELECT COUNT(*)::int AS total_feedback, " +
                "ROUND(COALESCE(AVG(rating), 0)::numeric, 1)::float AS avg_rating " +
                "FROM feedback " +
                "WHERE created_at >= NOW() - INTERVAL '7 days'"
            )
        ]);

        res.json({
            feedback: feedbackRes.rows,
            summary: summaryRes.rows[0] || { total_feedback: 0, avg_rating: 0 }
        });
    } catch (error) {
        console.error('Chef feedback error:', error);
        if (isPgOptionalDataError(error)) {
            return res.json({
                feedback: [],
                summary: { total_feedback: 0, avg_rating: 0 }
            });
        }
        res.status(500).json({ error: error.message || 'Failed to fetch chef feedback' });
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

app.get('/api/impact', optionalAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*)::int AS meals_rescued,
                COALESCE(SUM(total_quantity_kg), 0)::float AS food_saved
             FROM donations
             WHERE status = 'completed'`
        );

        const stats = result.rows[0] || {};
        const mealsRescued = Number(stats.meals_rescued) || 0;
        const foodSaved = Number(stats.food_saved) || 0;
        const peopleFed = Math.max(0, Math.round(foodSaved * 2));
        const co2Prevented = Math.max(0, Number((foodSaved * 2.5).toFixed(1)));

        res.json({
            meals_rescued: mealsRescued,
            food_saved: foodSaved,
            people_fed: peopleFed,
            co2_prevented: co2Prevented
        });
    } catch (error) {
        console.error('Impact stats error:', error);
        res.status(500).json({ error: 'Failed to fetch impact stats' });
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
app.get('/api/analytics/overview', authMiddleware, requireRole(['super_admin', 'hostel_admin', 'mess_manager', 'chef']), async (req, res) => {
    try {
        const today = getISTNow().dateString;
        const [metrics, monthlyWasteRes, servedVsWastedRes, wasteByHostelRes, ngoPickupRes, recentActivitiesRes, activeAlertsRes, attendanceOverviewRes] = await Promise.all([
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
            ),
            pool.query(
                "SELECT meal_type, COUNT(*)::int AS total_present " +
                "FROM attendance " +
                "WHERE status = 'present' AND attendance_date = $1 " +
                "GROUP BY meal_type ORDER BY meal_type",
                [today]
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
            attendance_overview: attendanceOverviewRes.rows.map((row) => ({
                meal_type: row.meal_type,
                total_present: Number(row.total_present) || 0
            })),
            attendance_date: today,
            activities,
            alerts
        });
    } catch (error) {
        console.error('Overview analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

app.get('/api/admin/meal-governance', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    try {
        const queryDate = normalizeDateInput(req.query.date, getISTNow().dateString);
        const mealType = normalizeMealType(req.query.meal_type);

        await syncSkippedBookings(pool, { bookingDate: queryDate, mealType });

        const bookingFilters = ['mb.booking_date = $1', "mb.status <> 'cancelled'"];
        const bookingParams = [queryDate];
        let index = 2;

        if (mealType) {
            bookingFilters.push(`m.meal_type = $${index++}`);
            bookingParams.push(mealType);
        }

        const [
            userCountRes,
            bookingTotalsRes,
            penaltyRewardRes,
            absenteeRes,
            flaggedUsersRes,
            userHistoryRes
        ] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS total_users FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE up.is_active = true AND LOWER(r.name) = 'student'"),
            pool.query(
                `SELECT COUNT(*)::int AS total_meals_booked,
                        COUNT(*) FILTER (WHERE mb.status = 'attended')::int AS meals_attended,
                        COUNT(*) FILTER (WHERE mb.status = 'skipped')::int AS meals_skipped
                 FROM meal_bookings mb
                 JOIN meals m ON m.id = mb.meal_id
                 WHERE ${bookingFilters.join(' AND ')}`,
                bookingParams
            ),
            pool.query(
                `SELECT COALESCE(SUM(total_penalties), 0)::int AS total_penalties_applied,
                        COALESCE(SUM(total_rewards), 0)::int AS total_rewards_given
                 FROM student_rewards`
            ),
            pool.query(
                `SELECT up.id, up.full_name AS name, up.email,
                        COUNT(*) FILTER (WHERE mb.status = 'skipped')::int AS skipped_count,
                        COUNT(*) FILTER (WHERE mb.status = 'attended')::int AS attended_count
                 FROM meal_bookings mb
                 JOIN user_profiles up ON up.id = mb.user_id
                 JOIN meals m ON m.id = mb.meal_id
                 WHERE ${bookingFilters.join(' AND ')}
                 GROUP BY up.id, up.full_name, up.email
                 ORDER BY skipped_count DESC, attended_count ASC, up.full_name ASC
                 LIMIT 10`,
                bookingParams
            ),
            pool.query(
                `SELECT up.id, up.full_name AS name, up.email, sr.skipped_meals_count, sr.penalty_status, sr.total_penalties, sr.total_rewards
                 FROM student_rewards sr
                 JOIN user_profiles up ON up.id = sr.user_id
                 WHERE sr.skipped_meals_count > 0 OR sr.penalty_status = 'penalty' OR sr.total_rewards > 0
                 ORDER BY sr.penalty_status DESC, sr.skipped_meals_count DESC, sr.total_rewards DESC, up.full_name ASC`
            ),
            pool.query(
                `SELECT mb.id, mb.user_id, up.full_name AS name, up.email, mb.booking_date, m.meal_type,
                        mb.status, mb.original_price, mb.discounted_price, mb.reward_applied, mb.attendance_status
                 FROM meal_bookings mb
                 JOIN user_profiles up ON up.id = mb.user_id
                 JOIN meals m ON m.id = mb.meal_id
                 WHERE ${bookingFilters.join(' AND ')}
                 ORDER BY mb.booking_date DESC, up.full_name ASC, m.meal_type ASC
                 LIMIT 200`,
                bookingParams
            )
        ]);

        const totals = bookingTotalsRes.rows[0] || {
            total_meals_booked: 0,
            meals_attended: 0,
            meals_skipped: 0
        };
        const totalMealsBooked = Number(totals.total_meals_booked) || 0;
        const mealsAttended = Number(totals.meals_attended) || 0;
        const attendanceRate = totalMealsBooked > 0
            ? Number(((mealsAttended / totalMealsBooked) * 100).toFixed(1))
            : 0;

        return res.json({
            filters: {
                date: queryDate,
                meal_type: mealType || null
            },
            overview: {
                total_users: Number(userCountRes.rows[0]?.total_users) || 0,
                total_meals_booked: totalMealsBooked,
                attendance_rate: attendanceRate,
                total_penalties_applied: Number(penaltyRewardRes.rows[0]?.total_penalties_applied) || 0,
                total_rewards_given: Number(penaltyRewardRes.rows[0]?.total_rewards_given) || 0,
                meals_attended: mealsAttended,
                meals_skipped: Number(totals.meals_skipped) || 0
            },
            insights: {
                frequent_absentees: absenteeRes.rows,
                flagged_users: flaggedUsersRes.rows
            },
            user_history: userHistoryRes.rows
        });
    } catch (error) {
        console.error('Meal governance analytics error:', error);
        return res.status(500).json({ error: 'Failed to fetch meal governance analytics' });
    }
});

app.get('/api/admin/meal-governance/export', authMiddleware, requireRole(['super_admin', 'hostel_admin']), async (req, res) => {
    try {
        const queryDate = normalizeDateInput(req.query.date, getISTNow().dateString);
        const mealType = normalizeMealType(req.query.meal_type);
        await syncSkippedBookings(pool, { bookingDate: queryDate, mealType });

        const params = [queryDate];
        let query = `
            SELECT up.full_name AS name, up.email, mb.booking_date, m.meal_type,
                   mb.status, mb.attendance_status, mb.original_price, mb.discounted_price,
                   mb.reward_applied
            FROM meal_bookings mb
            JOIN user_profiles up ON up.id = mb.user_id
            JOIN meals m ON m.id = mb.meal_id
            WHERE mb.booking_date = $1 AND mb.status <> 'cancelled'
        `;

        if (mealType) {
            query += ' AND m.meal_type = $2';
            params.push(mealType);
        }

        query += ' ORDER BY up.full_name ASC, m.meal_type ASC';

        const result = await pool.query(query, params);
        const csvRows = [
            ['Name', 'Email', 'Booking Date', 'Meal Type', 'Status', 'Attendance Status', 'Original Price', 'Discounted Price', 'Reward Applied'].join(',')
        ];

        result.rows.forEach((row) => {
            csvRows.push([
                `"${String(row.name || '').replace(/"/g, '""')}"`,
                `"${String(row.email || '').replace(/"/g, '""')}"`,
                row.booking_date,
                row.meal_type,
                row.status,
                row.attendance_status,
                toNumber(row.original_price, DEFAULT_MEAL_BASE_FEE).toFixed(2),
                toNumber(row.discounted_price, DEFAULT_MEAL_BASE_FEE).toFixed(2),
                row.reward_applied ? 'true' : 'false'
            ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="meal-governance-${queryDate}.csv"`);
        return res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Meal governance export error:', error);
        return res.status(500).json({ error: 'Failed to export meal governance report' });
    }
});

async function getGlobalDashboardStats(client, filters = {}) {
    await syncSkippedBookings(client, { bookingDate: filters.date || '', mealType: filters.mealType || '' });
    const records = await queryMealRecords(client, filters);
    const totals = buildMealTotals(records);
    return {
        total_meals_booked: totals.meals_booked,
        total_attended: totals.meals_attended,
        total_skipped: totals.meals_skipped,
        present_absent_ratio: totals.present_absent_ratio,
        attendance_rate: totals.attendance_rate
    };
}

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const date = normalizeDateInput(req.query.date, '');
        const mealType = normalizeMealType(req.query.meal_type);
        const stats = await getGlobalDashboardStats(pool, { date, mealType });
        return res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET /api/student/dashboard - Student dashboard now exposes global meal metrics
app.get('/api/student/dashboard', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        await syncSkippedBookings(pool, { userId: req.user.id });
        const [globalStats, donationsRes, rewardRes] = await Promise.all([
            getGlobalDashboardStats(pool),
            pool.query("SELECT COUNT(*)::int AS donations_count FROM donations WHERE status = 'completed'"),
            pool.query(
                `SELECT points, total_meals, total_rewards, skipped_meals_count, penalty_status, total_penalties, penalty_note
                 FROM student_rewards WHERE user_id = $1`,
                [req.user.id]
            )
        ]);

        const reward = rewardRes.rows[0] || {
            points: 0,
            total_meals: 0,
            total_rewards: 0,
            skipped_meals_count: 0,
            penalty_status: 'clear',
            total_penalties: 0,
            penalty_note: ''
        };

        res.json({
            meals_booked: globalStats.total_meals_booked,
            meals_attended: globalStats.total_attended,
            meals_skipped: globalStats.total_skipped,
            attendance_rate: globalStats.attendance_rate,
            present_absent_ratio: globalStats.present_absent_ratio,
            donations_completed: donationsRes.rows[0]?.donations_count || 0,
            reward_summary: {
                points: Number(reward.points) || 0,
                total_meals: Number(reward.total_meals) || 0,
                total_rewards: Number(reward.total_rewards) || 0
            },
            penalty_summary: {
                skipped_meals_count: Number(reward.skipped_meals_count) || 0,
                penalty_status: normalizePenaltyStatus(reward.penalty_status),
                total_penalties: Number(reward.total_penalties) || 0,
                note: reward.penalty_note || ''
            },
            fee_preview: buildFeePreview({ rewardApplied: true })
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch student dashboard data' });
    }
});

// GET /api/mess-manager/dashboard - Mess manager summary
app.get('/api/mess-manager/dashboard', authMiddleware, requireRole(['mess_manager', 'hostel_admin', 'super_admin']), async (req, res) => {
    try {
        const today = getISTNow().dateString;
        await syncSkippedBookings(pool, { bookingDate: today });
        const [todayRecords, globalStats, lowStockRes, wastageRes, alertsRes, penaltyRes, rewardRes] = await Promise.all([
            queryMealRecords(pool, { date: today }),
            getGlobalDashboardStats(pool),
            pool.query("SELECT COUNT(*)::int AS low_stock_items FROM inventory WHERE is_active = true AND quantity <= reorder_level"),
            pool.query("SELECT ROUND(COALESCE(SUM(quantity_wasted), 0)::numeric, 2)::float AS today_wastage FROM wastage_logs WHERE date = CURRENT_DATE"),
            pool.query(
                "SELECT id, item_name, quantity, reorder_level FROM inventory " +
                "WHERE is_active = true AND quantity <= reorder_level ORDER BY quantity ASC LIMIT 5"
            ),
            pool.query(`SELECT COUNT(*)::int AS total_penalties FROM student_rewards WHERE penalty_status = 'penalty'`),
            pool.query(`SELECT COALESCE(SUM(total_rewards), 0)::int AS total_rewards FROM student_rewards`)
        ]);

        const attendanceBuckets = buildAttendanceBuckets(todayRecords);
        const todayTotals = buildMealTotals(todayRecords);
        const totalsByMeal = MEAL_ORDER.map((meal) => {
            const mealRecords = todayRecords.filter((record) => record.meal_type === meal);
            const mealBuckets = buildAttendanceBuckets(mealRecords);
            return {
                meal_type: meal,
                total_present: mealBuckets.total_present,
                total_absent: mealBuckets.total_absent
            };
        });

        res.json({
            stats: {
                total_bookings: globalStats.total_meals_booked,
                expected_attendance: todayTotals.meals_booked,
                low_stock_items: lowStockRes.rows[0]?.low_stock_items || 0,
                today_wastage: wastageRes.rows[0]?.today_wastage || 0,
                meals_attended: globalStats.total_attended,
                meals_skipped: globalStats.total_skipped,
                total_penalties: penaltyRes.rows[0]?.total_penalties || 0,
                total_rewards: rewardRes.rows[0]?.total_rewards || 0,
                present_absent_ratio: globalStats.present_absent_ratio
            },
            attendance: {
                date: today,
                total_present: attendanceBuckets.total_present,
                total_absent: attendanceBuckets.total_absent,
                students: attendanceBuckets.present_users,
                present_users: attendanceBuckets.present_users,
                absent_users: attendanceBuckets.absent_users,
                totals_by_meal: totalsByMeal,
                totals: todayTotals
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

routes.get('/menu', async (req, res) => {
    try {
        const queryDate = normalizeDateInput(req.query.date, '');

        if (queryDate) {
            const result = await pool.query(
                "SELECT m.id, m.date, m.meal_type, m.start_time, m.end_time, " +
                "COALESCE(STRING_AGG(mm.item_name, ', ' ORDER BY mm.sort_order), '') AS items " +
                "FROM meals m " +
                "LEFT JOIN meal_menus mm ON mm.meal_id = m.id " +
                "WHERE m.date = $1 " +
                "GROUP BY m.id " +
                "ORDER BY m.start_time",
                [queryDate]
            );
            return res.json(result.rows);
        }

        const weekStart = req.query.week_start || getWeekStartISO();
        const votes = await loadVotesForWeek(weekStart);
        const { finalMenu } = buildFinalMenuFromVotes(votes);

        return res.json({
            week_start: weekStart,
            menus: MENU_DAYS.map((day) => ({
                day,
                meals: finalMenu[day] || DEFAULT_MENU_OPTIONS[day] || {}
            }))
        });
    } catch (error) {
        console.error('Menu fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

routes.post('/menu', authMiddleware, requireRole(['super_admin', 'mess_manager', 'hostel_admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const date = normalizeDateInput(req.body?.date, '');
        const mealType = normalizeMealType(req.body?.meal_type);
        const timing = getMealTimingForType(mealType);
        const startTime = String(req.body?.start_time || timing?.start || '').trim();
        const endTime = String(req.body?.end_time || timing?.end || '').trim();
        const items = req.body?.items || [];

        if (!date || !mealType || !startTime || !endTime) {
            return res.status(400).json({ error: 'date, meal_type, start_time and end_time are required' });
        }

        await client.query('BEGIN');
        const mealId = await upsertWeekMenuEntry(client, {
            date,
            mealType,
            startTime,
            endTime,
            items,
            actorId: req.user.id
        });
        await client.query('COMMIT');

        return res.status(201).json({ message: 'Menu saved successfully', meal_id: mealId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Menu save error:', error);
        return res.status(500).json({ error: 'Failed to save menu' });
    } finally {
        client.release();
    }
});

app.use('/api', routes);

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Invalid JSON request body:', {
            method: req.method,
            url: req.originalUrl,
            message: err.message
        });
        return res.status(400).json({ message: 'Invalid JSON request body' });
    }

    if (err && err.message === 'CORS origin not allowed') {
        console.error('CORS error:', {
            method: req.method,
            url: req.originalUrl,
            origin: req.headers.origin
        });
        return res.status(403).json({ message: 'CORS origin not allowed' });
    }

    console.error('Unhandled error:', {
        method: req.method,
        url: req.originalUrl,
        status: err?.status || 500,
        message: err?.message,
        stack: err?.stack
    });
    return res
        .status(err?.status || 500)
        .json({ message: err?.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'configured' : '⚠️  DATABASE_URL not set'}`);
});

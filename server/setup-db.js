import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from parent directory
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
}

console.log('🔗 Connecting to Neon PostgreSQL...');

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSQL(filePath, label) {
    try {
        const sql = readFileSync(filePath, 'utf-8');
        console.log(`\n📦 Running ${label}...`);
        await pool.query(sql);
        console.log(`✅ ${label} — SUCCESS`);
    } catch (error) {
        console.error(`❌ ${label} — FAILED:`, error.message);
        // Don't exit — some errors like "already exists" are okay
    }
}

async function main() {
    try {
        // Test connection
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Connected! Server time:', res.rows[0].now);

        // Run schema
        await runSQL(join(__dirname, '..', 'database', 'schema.sql'), 'Schema (tables, indexes, triggers)');

        // Run seed data
        await runSQL(join(__dirname, '..', 'database', 'seed.sql'), 'Seed data (roles, hostels, inventory, etc.)');

        // Run meal seeds if exists
        try {
            await runSQL(join(__dirname, '..', 'database', 'seed_meals.sql'), 'Meal seed data');
        } catch { /* optional file */ }

        // Verify tables were created
        const tables = await pool.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('\n📋 Tables created in database:');
        tables.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });

        console.log(`\n🎉 Database setup complete! ${tables.rows.length} tables ready.`);
        console.log('   You can now start the backend with: npm run dev');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        await pool.end();
    }
}

main();

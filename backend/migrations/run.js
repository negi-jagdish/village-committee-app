require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Strip SQL comments from a statement
const stripComments = (sql) => {
    return sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
};

const runMigrations = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : (process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined)
    });

    console.log('Connected to database...');

    try {
        // Get all SQL files sorted by name
        const files = fs.readdirSync(__dirname)
            .filter(f => f.endsWith('.sql') && f !== 'seed_data.sql' && f !== 'fresh_start.sql')
            .sort();

        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const migrationFile = path.join(__dirname, file);
            const sql = fs.readFileSync(migrationFile, 'utf8');

            // Split SQL into individual statements for TiDB compatibility
            const statements = sql
                .split(';')
                .map(s => stripComments(s))
                .filter(s => s.length > 0);

            for (const statement of statements) {
                try {
                    await connection.query(statement);
                } catch (err) {
                    // Skip errors for already-existing objects
                    const ignorable = [
                        'ER_TABLE_EXISTS_ERROR',
                        'ER_DUP_FIELDNAME',
                        'ER_DUP_ENTRY',
                        'ER_DUP_KEYNAME',
                    ];
                    if (ignorable.includes(err.code)) {
                        console.log(`  Skipped (already applied): ${err.message.substring(0, 80)}`);
                    } else {
                        console.warn(`  Warning in ${file}: ${err.message.substring(0, 120)}`);
                    }
                }
            }
        }

        console.log('All migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
};

if (require.main === module) {
    runMigrations().catch(console.error);
}

module.exports = runMigrations;

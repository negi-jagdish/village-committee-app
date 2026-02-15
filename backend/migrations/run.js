require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        multipleStatements: true,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : (process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined)
    });

    console.log('Connected to database...');

    try {
        // Get all SQL files sorted by name
        const files = fs.readdirSync(__dirname)
            .filter(f => f.endsWith('.sql') && f !== 'seed_data.sql')
            .sort();

        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const migrationFile = path.join(__dirname, file);
            const sql = fs.readFileSync(migrationFile, 'utf8');
            await connection.query(sql);
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

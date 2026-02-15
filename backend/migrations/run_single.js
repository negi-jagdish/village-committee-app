require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const runSingleMigration = async () => {
    const fileName = process.argv[2];
    if (!fileName) {
        console.error('Please provide a migration filename');
        process.exit(1);
    }

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
        console.log(`Running migration: ${fileName}`);
        const migrationFile = path.join(__dirname, fileName);
        if (!fs.existsSync(migrationFile)) {
            throw new Error(`File not found: ${migrationFile}`);
        }
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await connection.query(sql);

        console.log(`Migration ${fileName} completed successfully!`);
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
};

runSingleMigration().catch(console.error);

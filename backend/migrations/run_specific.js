require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const runSpecificMigration = async (filename) => {
    if (!filename) {
        console.error('Please provide a migration filename');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log('Connected to database...');

    try {
        const migrationFile = path.join(__dirname, filename);
        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Migration file not found: ${filename}`);
        }

        console.log(`Running migration: ${filename}`);
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await connection.query(sql);

        console.log(`Migration ${filename} completed successfully!`);
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
};

const fileToRun = process.argv[2];
runSpecificMigration(fileToRun).catch(console.error);

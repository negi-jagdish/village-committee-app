const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const csv = require('csv-parser'); // You might need to install this: npm install csv-parser
require('dotenv').config({ path: '../.env' });

async function importMembers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Connected to database.');

        // determine file type
        const jsonPath = path.join(__dirname, 'members.json');
        const csvPath = path.join(__dirname, 'members.csv');

        let members = [];

        if (fs.existsSync(jsonPath)) {
            console.log('Reading members.json...');
            const data = fs.readFileSync(jsonPath, 'utf8');
            members = JSON.parse(data);
        } else if (fs.existsSync(csvPath)) {
            console.log('Reading members.csv...');
            members = await new Promise((resolve) => {
                const results = [];
                fs.createReadStream(csvPath)
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => resolve(results));
            });
        } else {
            console.error('No members.json or members.csv found in scripts directory.');
            process.exit(1);
        }

        console.log(`Found ${members.length} records to process.`);

        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (const member of members) {
            // Validate required fields
            if (!member.name || !member.father_name || !member.village_landmark || !member.current_address || !member.contact_1) {
                console.error(`Skipping invalid record: ${JSON.stringify(member)} - Missing required fields`);
                failed++;
                continue;
            }

            // Check if exists
            const [existing] = await connection.execute('SELECT id FROM members WHERE contact_1 = ?', [member.contact_1]);
            if (existing.length > 0) {
                console.log(`Skipping ${member.name} (${member.contact_1}) - Already exists`);
                skipped++;
                continue;
            }

            // Hash password (mobile number)
            const passwordHash = await bcrypt.hash(member.contact_1.toString(), 10);

            try {
                await connection.execute(
                    `INSERT INTO members 
                    (name, father_name, village_landmark, current_address, contact_1, password_hash, role, status, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, 'member', 'active', TRUE)`,
                    [
                        member.name,
                        member.father_name,
                        member.village_landmark,
                        member.current_address,
                        member.contact_1,
                        passwordHash
                    ]
                );
                console.log(`Imported: ${member.name}`);
                success++;
            } catch (err) {
                console.error(`Failed to insert ${member.name}:`, err.message);
                failed++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Import Complete.`);
        console.log(`Success: ${success}`);
        console.log(`Skipped (Duplicate): ${skipped}`);
        console.log(`Failed (Error/Invalid): ${failed}`);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await connection.end();
    }
}

// Check if csv-parser is needed
if (!fs.existsSync(path.join(__dirname, '../node_modules/csv-parser'))) {
    console.log('Installing csv-parser...');
    const { execSync } = require('child_process');
    execSync('npm install csv-parser', { cwd: path.join(__dirname, '../') });
}

importMembers();

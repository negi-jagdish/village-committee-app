const db = require('./src/config/database');
require('dotenv').config();

const debugInsert = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database');

        // 1. Get a member
        const [members] = await connection.query('SELECT id, name FROM members LIMIT 1');
        if (members.length === 0) throw new Error('No members found');
        const memberId = members[0].id;
        console.log('Using Member:', members[0]);

        // 2. Get a drive
        const [drives] = await connection.query('SELECT id, title FROM contribution_drives LIMIT 1');
        const driveId = drives.length > 0 ? drives[0].id : null;
        console.log('Using Drive:', drives[0]);

        // 3. Get admin (created_by)
        const [admins] = await connection.query("SELECT id, name FROM members WHERE role IN ('president', 'secretary') LIMIT 1");
        if (admins.length === 0) throw new Error('No admin found');
        const adminId = admins[0].id;
        console.log('Using Admin:', admins[0]);

        // 4. Try INSERT with exact App types
        console.log('Attempting INSERT with App types (strings, undefined)...');

        // Simulating req.body
        const body = {
            member_id: memberId.toString(),
            drive_id: driveId.toString(),
            amount: "100",
            payment_method: "cash",
            payment_date: "2026-02-15",
            // description, reference_id, etc are undefined
        };
        const userId = adminId;
        const screenshotUrl = null;

        const params = [
            body.member_id || null,
            body.drive_id || null,
            body.amount,
            body.description || null,
            body.description_hi || null,
            body.payment_method,
            body.payment_date || null,
            body.reference_id || null,
            screenshotUrl,
            userId
        ];

        console.log('Params:', params);

        const [result] = await connection.query(
            `INSERT INTO transactions 
       (type, member_id, drive_id, amount, description, description_hi, payment_method, payment_date, reference_id, screenshot_url, status, created_by)
       VALUES ('income', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
            params
        );

        console.log('INSERT Success:', result);

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('INSERT Failed:', error);
        console.error('Error Message:', error.message);
        console.error('SQL Message:', error.sqlMessage);
        process.exit(1);
    }
};

debugInsert();

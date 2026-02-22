const mysql = require('mysql2/promise');

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: '178.16.138.41',
            port: 3306,
            user: 'village_user',
            password: 'VillageAdmin@2024',
            database: 'village_committee'
        });

        console.log("Connected to RDS");

        const [result] = await connection.query(
            `INSERT INTO polls (title, description, image_url, created_by, is_anonymous, start_at, end_at, poll_type, allow_custom_answer, show_results) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'Test Poll',
                'Desc',
                null,
                1, // Assuming admin is 1
                true,
                new Date(),
                new Date(Date.now() + 86400000),
                'single',
                false,
                true
            ]
        );
        console.log("Inserted poll", result.insertId);
        await connection.end();
    } catch (e) {
        console.error("Error", e);
    }
}
test();

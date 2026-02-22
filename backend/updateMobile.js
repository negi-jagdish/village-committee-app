require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await connection.execute("SELECT id, mobile, first_name, last_name FROM members WHERE first_name LIKE '%SHANKAR%'");
        console.log("Found members:", rows);

        if (rows.length > 0) {
            const userId = rows[0].id; // Assuming the first one is correct
            console.log(`Updating user ${userId} to mobile 7838756087...`);
            await connection.execute("UPDATE members SET mobile = '7838756087' WHERE id = ?", [userId]);
            console.log("Update successful!");
        } else {
            console.log("User not found!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

main();

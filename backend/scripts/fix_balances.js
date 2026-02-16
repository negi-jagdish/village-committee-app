require('dotenv').config();
const db = require('../src/config/database');

async function recalculateBalances() {
    console.log('Starting balance recalculation...');
    try {
        // 1. Ensure cash_book rows exist
        await db.query(`
            INSERT IGNORE INTO cash_book (account_type, balance) VALUES 
            ('cash', 0.00),
            ('bank', 0.00)
        `);

        // 2. Calculate totals from transactions (approved only)
        const [rows] = await db.query(`
            SELECT 
                payment_method,
                SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_amount
            FROM transactions 
            WHERE status = 'approved'
            GROUP BY payment_method
        `);

        // 3. Update cash_book
        let cashBalance = 0;
        let bankBalance = 0;

        rows.forEach(row => {
            if (row.payment_method === 'cash') {
                cashBalance += parseFloat(row.net_amount);
            } else {
                bankBalance += parseFloat(row.net_amount);
            }
        });

        console.log(`Calculated Balances - Cash: ${cashBalance}, Bank: ${bankBalance}`);

        await db.query('UPDATE cash_book SET balance = ? WHERE account_type = ?', [cashBalance, 'cash']);
        await db.query('UPDATE cash_book SET balance = ? WHERE account_type = ?', [bankBalance, 'bank']);

        console.log('Cash book updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error recalculating balances:', error);
        process.exit(1);
    }
}

recalculateBalances();

const express = require('express');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard summary (all members can view for transparency)
router.get('/', auth, async (req, res) => {
    try {
        // Get cash and bank balances
        const [cashBook] = await db.query('SELECT * FROM cash_book');
        const balances = cashBook.reduce((acc, item) => {
            acc[item.account_type] = parseFloat(item.balance);
            return acc;
        }, { cash: 0, bank: 0 });

        // Get total income (approved)
        const [incomeResult] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND status = 'approved'`
        );
        const totalIncome = parseFloat(incomeResult[0].total);

        // Get total expenses (approved)
        const [expenseResult] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND status = 'approved'`
        );
        const totalExpenses = parseFloat(expenseResult[0].total);

        // Get pending expenses count
        const [pendingResult] = await db.query(
            `SELECT COUNT(*) as count FROM transactions WHERE type = 'expense' AND status = 'pending'`
        );
        const pendingExpenses = pendingResult[0].count;

        // Get active contribution drives count
        const [drivesResult] = await db.query(
            `SELECT COUNT(*) as count FROM contribution_drives WHERE is_active = TRUE`
        );
        const activeDrives = drivesResult[0].count;

        // Get total members
        const [membersResult] = await db.query(
            `SELECT COUNT(*) as count FROM members WHERE is_active = TRUE`
        );
        const totalMembers = membersResult[0].count;

        // Get recent transactions (including pending for visibility)
        const [recentTransactions] = await db.query(
            `SELECT t.*, m.name as member_name, m.profile_picture as profile_picture_url, d.title as drive_title
       FROM transactions t
       LEFT JOIN members m ON t.member_id = m.id
       LEFT JOIN contribution_drives d ON t.drive_id = d.id
       ORDER BY t.created_at DESC
       LIMIT 10`
        );

        res.json({
            balances,
            totalBalance: balances.cash + balances.bank,
            totalIncome,
            totalExpenses,
            pendingExpenses,
            activeDrives,
            totalMembers,
            recentTransactions
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get cash book entries (detailed transactions)
router.get('/cashbook', auth, async (req, res) => {
    try {
        const { account_type, start_date, end_date } = req.query;

        let query = `
      SELECT t.*, m.name as member_name, d.title as drive_title, c.name as created_by_name
      FROM transactions t
      LEFT JOIN members m ON t.member_id = m.id
      LEFT JOIN contribution_drives d ON t.drive_id = d.id
      LEFT JOIN members c ON t.created_by = c.id
      WHERE t.status = 'approved'
    `;
        const params = [];

        if (account_type) {
            if (account_type === 'cash') {
                query += ` AND t.payment_method = 'cash'`;
            } else {
                query += ` AND t.payment_method != 'cash'`;
            }
        }

        if (start_date) {
            query += ` AND t.created_at >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND t.created_at <= ?`;
            params.push(end_date);
        }

        query += ` ORDER BY t.created_at DESC`;

        const [transactions] = await db.query(query, params);

        // Calculate running balance
        let runningBalance = 0;
        const entriesWithBalance = transactions.reverse().map(t => {
            if (t.type === 'income') {
                runningBalance += parseFloat(t.amount);
            } else {
                runningBalance -= parseFloat(t.amount);
            }
            return { ...t, running_balance: runningBalance };
        }).reverse();

        // Get current balances
        const [cashBook] = await db.query('SELECT * FROM cash_book');
        const balances = cashBook.reduce((acc, item) => {
            acc[item.account_type] = parseFloat(item.balance);
            return acc;
        }, { cash: 0, bank: 0 });

        res.json({
            balances,
            entries: entriesWithBalance
        });
    } catch (error) {
        console.error('Cashbook error:', error);
        res.status(500).json({ error: 'Failed to fetch cashbook' });
    }
});

// Get collection summary by drive
router.get('/collection-summary', auth, async (req, res) => {
    try {
        const [drives] = await db.query(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM members WHERE is_active = TRUE) as total_members,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE drive_id = d.id AND type = 'income' AND status = 'approved') as collected_amount,
        (SELECT COUNT(DISTINCT member_id) FROM transactions WHERE drive_id = d.id AND type = 'income' AND status = 'approved') as contributors
      FROM contribution_drives d
      ORDER BY d.created_at DESC
    `);

        const summary = drives.map(d => ({
            ...d,
            target_amount: parseFloat(d.amount_per_member) * d.total_members,
            collected_amount: parseFloat(d.collected_amount),
            pending_amount: (parseFloat(d.amount_per_member) * d.total_members) - parseFloat(d.collected_amount),
            collection_rate: d.total_members > 0
                ? Math.round((d.contributors / d.total_members) * 100)
                : 0
        }));

        res.json(summary);
    } catch (error) {
        console.error('Collection summary error:', error);
        res.status(500).json({ error: 'Failed to fetch collection summary' });
    }
});

module.exports = router;

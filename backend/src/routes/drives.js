const express = require('express');
const db = require('../config/database');
const { auth, isPresident } = require('../middleware/auth');

const router = express.Router();

// Get all contribution drives
router.get('/', auth, async (req, res) => {
    try {
        const [drives] = await db.query(
            `SELECT d.*, m.name as created_by_name,
       (SELECT COUNT(DISTINCT member_id) FROM transactions WHERE drive_id = d.id AND type = 'income' AND status = 'approved') as contributors_count,
       (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE drive_id = d.id AND type = 'income' AND status = 'approved') as collected_amount
       FROM contribution_drives d
       LEFT JOIN members m ON d.created_by = m.id
       ORDER BY d.created_at DESC`
        );

        // Get total active members for each drive
        const [memberCount] = await db.query('SELECT COUNT(*) as count FROM members WHERE is_active = TRUE');
        const totalMembers = memberCount[0].count;

        const drivesWithStats = drives.map(drive => ({
            ...drive,
            total_members: totalMembers,
            target_amount: parseFloat(drive.amount_per_member) * totalMembers,
            collection_percentage: totalMembers > 0
                ? Math.round((parseFloat(drive.collected_amount) / (parseFloat(drive.amount_per_member) * totalMembers)) * 100)
                : 0
        }));

        res.json(drivesWithStats);
    } catch (error) {
        console.error('Get drives error:', error);
        res.status(500).json({ error: 'Failed to fetch drives' });
    }
});

// Get single drive with member-wise details
router.get('/:id', auth, async (req, res) => {
    try {
        const [drives] = await db.query('SELECT * FROM contribution_drives WHERE id = ?', [req.params.id]);

        if (drives.length === 0) {
            return res.status(404).json({ error: 'Drive not found' });
        }

        const drive = drives[0];

        // Get all members with their payment status for this drive
        const [members] = await db.query(
            `SELECT m.id, m.name, m.father_name, m.contact_1,
       COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.member_id = m.id AND t.drive_id = ? AND t.type = 'income' AND t.status = 'approved'), 0) as paid_amount,
       EXISTS(SELECT 1 FROM waivers w WHERE w.member_id = m.id AND w.drive_id = ?) as is_waived
       FROM members m
       WHERE m.is_active = TRUE
       ORDER BY m.name`,
            [req.params.id, req.params.id]
        );

        const memberDetails = members.map(m => ({
            ...m,
            amount_required: parseFloat(drive.amount_per_member),
            paid_amount: parseFloat(m.paid_amount),
            pending_amount: m.is_waived ? 0 : Math.max(0, parseFloat(drive.amount_per_member) - parseFloat(m.paid_amount)),
            status: m.is_waived ? 'paid' : parseFloat(m.paid_amount) >= parseFloat(drive.amount_per_member) ? 'paid' : parseFloat(m.paid_amount) > 0 ? 'partial' : 'pending',
            is_waived: !!m.is_waived
        }));

        res.json({ drive, members: memberDetails });
    } catch (error) {
        console.error('Get drive details error:', error);
        res.status(500).json({ error: 'Failed to fetch drive details' });
    }
});

// Create new drive (president only)
router.post('/', auth, isPresident, async (req, res) => {
    try {
        const { title, title_hi, description, description_hi, amount_per_member, start_date, end_date } = req.body;

        if (!title || !amount_per_member || !start_date) {
            return res.status(400).json({ error: 'Title, amount per member, and start date are required' });
        }

        const [result] = await db.query(
            `INSERT INTO contribution_drives 
       (title, title_hi, description, description_hi, amount_per_member, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, title_hi || null, description || null, description_hi || null, amount_per_member, start_date, end_date || null, req.user.id]
        );

        res.status(201).json({ id: result.insertId, message: 'Drive created successfully' });
    } catch (error) {
        console.error('Create drive error:', error);
        res.status(500).json({ error: 'Failed to create drive' });
    }
});

// Update drive (president only)
router.put('/:id', auth, isPresident, async (req, res) => {
    try {
        const { title, title_hi, description, description_hi, amount_per_member, start_date, end_date, is_active } = req.body;

        await db.query(
            `UPDATE contribution_drives SET 
       title = ?, title_hi = ?, description = ?, description_hi = ?,
       amount_per_member = ?, start_date = ?, end_date = ?, is_active = ?
       WHERE id = ?`,
            [title, title_hi, description, description_hi, amount_per_member, start_date, end_date, is_active, req.params.id]
        );

        res.json({ message: 'Drive updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update drive' });
    }
});

module.exports = router;

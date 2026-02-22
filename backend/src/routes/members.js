const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { auth, canManageMembers } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get basic member list for dropdowns (all authenticated users)
router.get('/list', auth, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT id, name, father_name, village_landmark, role, contact_1, status, sex, profile_picture FROM members';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = ?';
            params.push(status);
        } else if (!status) {
            // Default to active only if not specified
            query += ' WHERE status = "active"';
        }

        query += ' ORDER BY name';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Fetch members list error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Get member's payment status for all drives (cashier use when entering income)
router.get('/:id/drive-status', auth, async (req, res) => {
    try {
        // Get all active drives with member's payment status and waiver status
        const [drives] = await db.query(
            `SELECT d.id, d.title, d.title_hi, d.amount_per_member,
             COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.member_id = ? AND t.drive_id = d.id AND t.type = 'income' AND t.status = 'approved'), 0) as paid_amount,
             EXISTS(SELECT 1 FROM waivers w WHERE w.member_id = ? AND w.drive_id = d.id) as is_waived
             FROM contribution_drives d
             WHERE d.is_active = TRUE
             ORDER BY d.created_at DESC`,
            [req.params.id, req.params.id]
        );

        let drivesWithStatus = drives.map(d => ({
            id: d.id,
            title: d.title,
            title_hi: d.title_hi,
            amount_per_member: parseFloat(d.amount_per_member),
            paid_amount: parseFloat(d.paid_amount),
            pending_amount: d.is_waived ? 0 : Math.max(0, parseFloat(d.amount_per_member) - parseFloat(d.paid_amount)),
            is_paid: !!d.is_waived || parseFloat(d.paid_amount) >= parseFloat(d.amount_per_member),
            is_waived: !!d.is_waived
        }));

        // Check for Legacy Dues
        const [memberData] = await db.query('SELECT legacy_due FROM members WHERE id = ?', [req.params.id]);
        const legacyDue = parseFloat(memberData[0].legacy_due || 0);

        if (legacyDue > 0) {
            const [legacyPaid] = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total_paid 
                 FROM transactions 
                 WHERE member_id = ? AND drive_id IS NULL AND type = 'income' AND status = 'approved'`,
                [req.params.id]
            );
            const paidAmount = parseFloat(legacyPaid[0].total_paid);
            const pendingAmount = Math.max(0, legacyDue - paidAmount);

            // Prepend legacy due item (ID 0)
            drivesWithStatus.unshift({
                id: 0, // Special ID for frontend
                title: 'Past Dues / Opening Balance',
                title_hi: 'बकाया राशि / प्रारंभिक शेष',
                amount_per_member: legacyDue,
                paid_amount: paidAmount,
                pending_amount: pendingAmount,
                is_paid: pendingAmount <= 0,
                is_waived: false
            });
        }

        res.json(drivesWithStatus);
    } catch (error) {
        console.error('Get drive status error:', error);
        res.status(500).json({ error: 'Failed to fetch drive status' });
    }
});

// Get all members with full details (for secretary/president)
router.get('/', auth, canManageMembers, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT id, name, father_name, village_landmark, contact_1, role, status, is_active, sex, legacy_due, created_at FROM members';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY name';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Get single member by ID
router.get('/:id', auth, async (req, res) => {
    try {

        const [rows] = await db.query(
            'SELECT id, name, father_name, mother_name, date_of_birth, village_landmark, current_address, contact_1, contact_2, email, role, is_active, sex, legacy_due, created_at, profile_picture, background_picture, bio FROM members WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch member' });
    }
});

// Create new member (secretary/president only)
router.post('/', auth, canManageMembers, async (req, res) => {
    try {
        const {
            name, father_name, mother_name, date_of_birth,
            village_landmark, current_address, contact_1, contact_2,
            email, password, role, status, sex, legacy_due
        } = req.body;

        // Validate required fields
        if (!name || !father_name || !village_landmark || !current_address || !contact_1 || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if contact already exists
        const [existing] = await db.query('SELECT id FROM members WHERE contact_1 = ?', [contact_1]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Contact number already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userStatus = status || 'active';
        const isActive = userStatus === 'active';

        const [result] = await db.query(
            `INSERT INTO members 
       (name, father_name, mother_name, date_of_birth, village_landmark, current_address, contact_1, contact_2, email, password_hash, role, status, is_active, sex, legacy_due)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, father_name, mother_name || null, date_of_birth || null, village_landmark, current_address, contact_1, contact_2 || null, email || null, hashedPassword, role || 'member', userStatus, isActive, sex || 'male', legacy_due || 0]
        );

        res.status(201).json({ id: result.insertId, message: 'Member created successfully' });
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// Update member (Granular permissions)
router.put('/:id', auth, async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        const { role: userRole, id: userId } = req.user;

        // 1. Fetch Target User to check their role
        const [targetRows] = await db.query('SELECT role FROM members WHERE id = ?', [targetId]);
        if (targetRows.length === 0) return res.status(404).json({ error: 'Member not found' });
        const targetUser = targetRows[0];

        // 2. Permission Check
        let canEdit = false;
        let restrictedFields = [];

        if (userRole === 'president') {
            canEdit = true; // President can edit everyone
        } else if (userRole === 'secretary') {
            if (targetUser.role === 'president') {
                return res.status(403).json({ error: 'Secretary cannot edit President profile' });
            }
            canEdit = true;
        } else if (userId === targetId) {
            canEdit = true;
            restrictedFields = ['name', 'contact_1', 'role', 'status']; // Self update restrictions
        }

        if (!canEdit) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // 3. Prepare Update Data
        const {
            name, father_name, mother_name, date_of_birth,
            village_landmark, current_address, contact_1, contact_2,
            email, role, status, sex, legacy_due
        } = req.body;

        // Construct update query dynamically based on allowed fields
        let updateFields = [];
        let params = [];

        // Helper to add field if not restricted
        const addField = (field, value) => {
            if (!restrictedFields.includes(field) && value !== undefined) {
                // Convert empty strings to NULL for optional fields to avoid strict mode errors
                const sanitizedValue = (value === '' && ['date_of_birth', 'email', 'mother_name', 'contact_2'].includes(field)) ? null : value;

                updateFields.push(`${field} = ?`);
                params.push(sanitizedValue);
            }
        };

        addField('father_name', father_name);
        addField('mother_name', mother_name);
        addField('date_of_birth', date_of_birth);
        addField('village_landmark', village_landmark);
        addField('current_address', current_address);
        addField('contact_2', contact_2);
        addField('email', email);
        addField('sex', sex);

        // Bio can be updated by anyone for their own profile
        const { bio } = req.body;
        addField('bio', bio);

        // Only President can update legacy_due
        if (userRole === 'president' && legacy_due !== undefined) {
            updateFields.push('legacy_due = ?');
            params.push(legacy_due);
        }

        // Restricted fields handling
        if (!restrictedFields.includes('name')) addField('name', name);
        if (!restrictedFields.includes('contact_1')) addField('contact_1', contact_1);
        if (!restrictedFields.includes('role')) addField('role', role);

        // Status handling (Sync with is_active)
        if (!restrictedFields.includes('status') && status) {
            updateFields.push('status = ?');
            params.push(status);

            // Sync is_active
            updateFields.push('is_active = ?');
            params.push(status === 'active');
        }

        if (updateFields.length === 0) {
            return res.json({ message: 'No changes to update' });
        }

        const query = `UPDATE members SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(targetId);

        await db.query(query, params);

        res.json({ message: 'Member updated successfully' });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Upload profile picture
router.post('/:id/profile-picture', auth, upload.single('profile_picture'), async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);

        // Members can only update their own profile picture
        if (req.user.id !== targetId && req.user.role !== 'president' && req.user.role !== 'secretary') {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let imageUrl = req.file.path;
        // If using local storage, construct full URL
        if (!imageUrl.startsWith('http')) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        await db.query('UPDATE members SET profile_picture = ? WHERE id = ?', [imageUrl, targetId]);

        res.json({ message: 'Profile picture updated', profile_picture: imageUrl });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

// Upload background picture
router.post('/:id/background-picture', auth, upload.single('background_picture'), async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);

        // Members can only update their own background picture
        if (req.user.id !== targetId && req.user.role !== 'president' && req.user.role !== 'secretary') {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let imageUrl = req.file.path; // Cloudinary URL or safe fallback
        // If using local storage, construct full URL
        if (!imageUrl.startsWith('http')) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        await db.query('UPDATE members SET background_picture = ? WHERE id = ?', [imageUrl, targetId]);

        res.json({ message: 'Background picture updated', background_picture: imageUrl });
    } catch (error) {
        console.error('Upload background picture error:', error);
        res.status(500).json({ error: 'Failed to upload background picture' });
    }
});

// Get member's contribution history
router.get('/:id/contributions', auth, async (req, res) => {
    try {
        // Members can view their own history, or secretary/president can view anyone's
        if (req.user.role !== 'president' && req.user.role !== 'secretary' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [contributions] = await db.query(
            `SELECT t.*, d.title, d.title_hi, d.amount_per_member
       FROM transactions t
       LEFT JOIN contribution_drives d ON t.drive_id = d.id
       WHERE t.member_id = ? AND t.type = 'income'
       ORDER BY t.created_at DESC`,
            [req.params.id]
        );

        // Get all active drives and calculate pending amounts
        const [drives] = await db.query('SELECT * FROM contribution_drives WHERE is_active = TRUE');

        const pending = [];

        // 1. Calculate Legacy Dues (Past Dues)
        const [memberData] = await db.query('SELECT legacy_due FROM members WHERE id = ?', [req.params.id]);
        const legacyDue = parseFloat(memberData[0].legacy_due || 0);

        if (legacyDue > 0) {
            const [legacyPaid] = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total_paid 
         FROM transactions 
         WHERE member_id = ? AND drive_id IS NULL AND type = 'income' AND status = 'approved'`,
                [req.params.id]
            );

            const paidAmount = parseFloat(legacyPaid[0].total_paid);
            const pendingLegacy = legacyDue - paidAmount;

            if (pendingLegacy > 0) {
                pending.push({
                    drive_id: null, // Special marker for legacy
                    drive_title: 'Past Dues / Opening Balance',
                    drive_title_hi: 'बकाया राशि / प्रारंभिक शेष',
                    amount_required: legacyDue,
                    amount_paid: paidAmount,
                    amount_pending: pendingLegacy
                });
            }
        }

        // 2. Calculate Drive Dues
        for (const drive of drives) {
            // Check waiver status
            const [waiver] = await db.query(
                'SELECT 1 FROM waivers WHERE member_id = ? AND drive_id = ?',
                [req.params.id, drive.id]
            );

            if (waiver.length > 0) continue; // Skip if waived

            const [paid] = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total_paid 
         FROM transactions 
         WHERE member_id = ? AND drive_id = ? AND type = 'income' AND status = 'approved'`,
                [req.params.id, drive.id]
            );

            const paidAmount = parseFloat(paid[0].total_paid);
            const pendingAmount = parseFloat(drive.amount_per_member) - paidAmount;

            if (pendingAmount > 0) {
                pending.push({
                    drive_id: drive.id,
                    drive_title: drive.title,
                    drive_title_hi: drive.title_hi,
                    amount_required: drive.amount_per_member,
                    amount_paid: paidAmount,
                    amount_pending: pendingAmount
                });
            }
        }

        res.json({ contributions, pending });
    } catch (error) {
        console.error('Get contributions error:', error);
        res.status(500).json({ error: 'Failed to fetch contributions' });
    }
});

// Waive contribution for a member (President only)
router.post('/:id/waive', auth, async (req, res) => {
    try {
        if (req.user.role !== 'president') {
            return res.status(403).json({ error: 'Only president can waive contributions' });
        }

        const { drive_id, reason } = req.body;

        if (!drive_id) {
            return res.status(400).json({ error: 'Drive ID is required' });
        }

        await db.query(
            'INSERT IGNORE INTO waivers (member_id, drive_id, reason, granted_by) VALUES (?, ?, ?, ?)',
            [req.params.id, drive_id, reason || null, req.user.id]
        );

        res.json({ message: 'Contribution waived successfully' });
    } catch (error) {
        console.error('Waive error:', error);
        res.status(500).json({ error: 'Failed to waive contribution' });
    }
});

// Remove waiver (President only)
router.delete('/:id/waive/:driveId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'president') {
            return res.status(403).json({ error: 'Only president can remove waivers' });
        }

        await db.query(
            'DELETE FROM waivers WHERE member_id = ? AND drive_id = ?',
            [req.params.id, req.params.driveId]
        );

        res.json({ message: 'Waiver removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove waiver' });
    }
});

module.exports = router;

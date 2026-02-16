const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { contact, password } = req.body;

        if (!contact || !password) {
            return res.status(400).json({ error: 'Contact number and password are required' });
        }

        const [rows] = await db.query(
            'SELECT * FROM members WHERE contact_1 = ? AND is_active = TRUE',
            [contact]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const { password_hash, ...userDetails } = user;

        res.json({
            token,
            user: userDetails
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const { password_hash, ...user } = req.user;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const isMatch = await bcrypt.compare(currentPassword, req.user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE members SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Reset password for any member (President only)
router.post('/reset-password/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'president') {
            return res.status(403).json({ error: 'Only president can reset passwords' });
        }

        const { newPassword } = req.body;
        const memberId = parseInt(req.params.id);

        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ error: 'New password must be at least 4 characters' });
        }

        // Check if member exists
        const [member] = await db.query('SELECT id, name FROM members WHERE id = ?', [memberId]);
        if (member.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE members SET password_hash = ? WHERE id = ?', [hashedPassword, memberId]);

        res.json({ message: `Password reset successfully for ${member[0].name}` });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});



// --- SIM & MPIN Login Routes ---

// Login with SIM (Phone Number)
router.post('/login-sim', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Clean phone number (remove +91, spaces, etc if needed, but for now exact match)
        // Ideally we should fuzzy match or store normalized numbers.
        // Assuming strict match for now or basic cleaning could be added.

        const [rows] = await db.query(
            'SELECT * FROM members WHERE contact_1 = ? AND is_active = TRUE',
            [phoneNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }

        const user = rows[0];

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const { password_hash, mpin_hash, ...userDetails } = user;

        res.json({
            token,
            user: userDetails
        });

    } catch (error) {
        console.error('SIM Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Set MPIN
router.post('/set-mpin', auth, async (req, res) => {
    try {
        const { mpin } = req.body;

        if (!mpin || mpin.length !== 4 || isNaN(mpin)) {
            return res.status(400).json({ error: 'MPIN must be a 4-digit number' });
        }

        const hashedMpin = await bcrypt.hash(mpin, 10);
        await db.query('UPDATE members SET mpin_hash = ? WHERE id = ?', [hashedMpin, req.user.id]);

        res.json({ message: 'MPIN set successfully' });
    } catch (error) {
        console.error('Set MPIN error:', error);
        res.status(500).json({ error: 'Failed to set MPIN' });
    }
});

// Login with MPIN
router.post('/login-mpin', async (req, res) => {
    try {
        const { contact, mpin } = req.body;

        if (!contact || !mpin) {
            return res.status(400).json({ error: 'Contact and MPIN are required' });
        }

        const [rows] = await db.query(
            'SELECT * FROM members WHERE contact_1 = ? AND is_active = TRUE',
            [contact]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];

        if (!user.mpin_hash) {
            return res.status(400).json({ error: 'MPIN not set for this user. Please login with password first.' });
        }

        const isMatch = await bcrypt.compare(mpin, user.mpin_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid MPIN' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const { password_hash, mpin_hash, ...userDetails } = user;

        res.json({
            token,
            user: userDetails
        });

    } catch (error) {
        console.error('MPIN Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;

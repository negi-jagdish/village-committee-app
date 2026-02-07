const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await db.query('SELECT * FROM members WHERE id = ? AND is_active = TRUE', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = rows[0];
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Role-based access control middleware
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

// Check if user can post news (reporter, cashier, secretary, president)
const canPostNews = (req, res, next) => {
    const allowedRoles = ['reporter', 'cashier', 'secretary', 'president'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to post news' });
    }
    next();
};

// Check if user is cashier (for creating transactions)
const isCashier = (req, res, next) => {
    if (req.user.role !== 'cashier') {
        return res.status(403).json({ error: 'Only cashier can perform this action' });
    }
    next();
};

// Check if user is president (for approvals)
const isPresident = (req, res, next) => {
    if (req.user.role !== 'president') {
        return res.status(403).json({ error: 'Only president can perform this action' });
    }
    next();
};

// Check if user can manage members (secretary or president)
const canManageMembers = (req, res, next) => {
    const allowedRoles = ['secretary', 'president'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to manage members' });
    }
    next();
};

module.exports = { auth, requireRole, canPostNews, isCashier, isPresident, canManageMembers };

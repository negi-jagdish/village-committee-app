const jwt = require('jsonwebtoken');
const db = require('../config/database');

module.exports = async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: Token required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch full user info to get name for typing indicator
        const [users] = await db.query('SELECT id, name, role FROM members WHERE id = ?', [decoded.id]);
        if (users.length === 0) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.user = users[0];
        next();
    } catch (err) {
        console.error('Socket Auth Error:', err);
        next(new Error('Authentication error: Invalid token'));
    }
};

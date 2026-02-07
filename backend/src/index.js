require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const driveRoutes = require('./routes/drives');
const transactionRoutes = require('./routes/transactions');
const newsRoutes = require('./routes/news');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const galleryRoutes = require('./routes/gallery');

const app = express();

// Security Middleware
app.use(helmet());

// Rate Limiting: 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(cors()); // In production, consider restricting origin: app.use(cors({ origin: 'https://jagdishnegi.in' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/gallery', galleryRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Village Committee API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

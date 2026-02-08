const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

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
const pollsRoutes = require('./routes/polls');
app.use('/api/polls', pollsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Village Committee API is running' });
});

// Error handling middleware
const PORT = process.env.PORT || 3000;
// Debug Cloudinary config
app.get('/api/debug-config', (req, res) => {
    res.json({
        cloudinary_configured: !!process.env.CLOUDINARY_CLOUD_NAME,
        cloud_name_masked: process.env.CLOUDINARY_CLOUD_NAME ? '***' : 'missing',
        api_key_masked: process.env.CLOUDINARY_API_KEY ? 'ok' : 'missing',
        api_secret_masked: process.env.CLOUDINARY_API_SECRET ? 'ok' : 'missing'
    });
});

const runMigrations = require('../migrations/run');

const startServer = async () => {
    try {
        console.log('Running database migrations...');
        await runMigrations();
        console.log('Migrations completed.');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err); // Log full error
    if (err.message) {
        res.status(500).json({ error: err.message, stack: err.stack });
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

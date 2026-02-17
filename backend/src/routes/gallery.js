const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all events
router.get('/events', async (req, res) => {
    try {
        // Fetch events with a count of media items and cover image
        const query = `
            SELECT e.*, m.name as created_by_name,
            (SELECT COUNT(*) FROM gallery_media gm WHERE gm.event_id = e.id) as media_count
            FROM events e
            JOIN members m ON e.created_by = m.id
            ORDER BY e.event_date DESC
        `;
        const [events] = await db.query(query);
        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Create new event (President, Secretary, Reporter)
router.post('/events', auth, upload.single('cover_image'), async (req, res) => {
    try {
        const { title, title_hi, event_date } = req.body;
        // Store relative path for local storage
        const cover_image = req.file ? '/uploads/' + req.file.filename : req.body.cover_image;

        // Role check
        if (!['president', 'secretary', 'reporter'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const query = `
            INSERT INTO events (title, title_hi, event_date, cover_image, created_by)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            title,
            title_hi || null,
            event_date,
            cover_image || null,
            req.user.id
        ]);

        res.status(201).json({ id: result.insertId, message: 'Event created successfully' });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get event details with media
router.get('/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;

        // Get event info
        const [events] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get media
        const [media] = await db.query(
            'SELECT * FROM gallery_media WHERE event_id = ? ORDER BY created_at DESC',
            [eventId]
        );

        res.json({ ...events[0], media });
    } catch (error) {
        console.error('Get event details error:', error);
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});

// Add media to event (President, Secretary, Reporter)
router.post('/media', auth, upload.single('media_file'), async (req, res) => {
    try {
        const { event_id, type, caption } = req.body;
        // Store relative path for local storage
        const url = req.file ? '/uploads/' + req.file.filename : req.body.url;

        if (!['president', 'secretary', 'reporter'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const query = `
            INSERT INTO gallery_media (event_id, type, url, caption)
            VALUES (?, ?, ?, ?)
        `;

        await db.query(query, [event_id, type, url, caption || null]);
        res.status(201).json({ message: 'Media added successfully' });
    } catch (error) {
        console.error('Add media error:', error);
        res.status(500).json({ error: 'Failed to add media' });
    }
});

// Delete media (President, Secretary, Reporter)
router.delete('/media/:id', auth, async (req, res) => {
    try {
        if (!['president', 'secretary', 'reporter'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM gallery_media WHERE id = ?', [req.params.id]);
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

// Delete event (President, Secretary, Reporter)
router.delete('/events/:id', auth, async (req, res) => {
    try {
        if (!['president', 'secretary', 'reporter'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Deleting event should cascade to media if foreign key is set up with ON DELETE CASCADE
        // Otherwise we should delete media first. Assuming CASCADE for now or manual cleanup.
        await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;

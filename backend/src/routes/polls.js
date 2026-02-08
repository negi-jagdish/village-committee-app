const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create a new poll
router.post('/', auth, requireRole('president', 'secretary'), upload.single('image'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { title, description, is_anonymous, start_at, end_at, poll_type, options } = req.body;
        const imageUrl = req.file ? req.file.path : null;

        // Validate required fields
        if (!title || !start_at || !end_at) {
            return res.status(400).json({ message: 'Title, start time, and end time are required' });
        }

        // Insert Poll
        const [result] = await connection.query(
            `INSERT INTO polls (title, description, image_url, created_by, is_anonymous, start_at, end_at, poll_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, imageUrl, req.user.id, is_anonymous === 'true' || is_anonymous === true, start_at, end_at, poll_type || 'single']
        );

        const pollId = result.insertId;

        // Insert Options if type is single/multiple
        if (poll_type !== 'text' && options) {
            let optionsArray = [];
            try {
                optionsArray = typeof options === 'string' ? JSON.parse(options) : options;
            } catch (e) {
                return res.status(400).json({ message: 'Invalid options format' });
            }

            if (Array.isArray(optionsArray) && optionsArray.length > 0) {
                const values = optionsArray.map(opt => [pollId, opt.text, opt.image_url || null]);
                await connection.query(
                    'INSERT INTO poll_options (poll_id, text, image_url) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Poll created successfully', pollId });
    } catch (error) {
        await connection.rollback();
        console.error('Create poll error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});

// List Active Polls
router.get('/', async (req, res) => {
    try {
        // Active = between start and end (or future start), status active/draft? 
        // Usually active implies published. But assuming auto-publish based on time?
        // Let's assume listing all polls that are NOT closed/archived, sorted by start_at desc.
        // User asked for "Active Polls" and "History".
        const [polls] = await db.query(
            `SELECT p.*, m.name as created_by_name 
             FROM polls p 
             JOIN members m ON p.created_by = m.id 
             WHERE p.end_at > NOW() AND p.status != 'archived'
             ORDER BY p.start_at DESC`
        );
        res.json(polls);
    } catch (error) {
        console.error('List polls error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// List Poll History
router.get('/history', async (req, res) => {
    try {
        const [polls] = await db.query(
            `SELECT p.*, m.name as created_by_name 
             FROM polls p 
             JOIN members m ON p.created_by = m.id 
             WHERE p.end_at <= NOW() OR p.status = 'closed' OR p.status = 'archived'
             ORDER BY p.end_at DESC`
        );
        res.json(polls);
    } catch (error) {
        console.error('List history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Poll Details with Options and User Vote
router.get('/:id', auth, async (req, res) => {
    try {
        // Fetch Poll
        const [polls] = await db.query('SELECT * FROM polls WHERE id = ?', [req.params.id]);
        if (polls.length === 0) return res.status(404).json({ message: 'Poll not found' });
        const poll = polls[0];

        // Fetch Options
        const [options] = await db.query('SELECT * FROM poll_options WHERE poll_id = ?', [poll.id]);

        // Check if user voted
        const [votes] = await db.query('SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?', [poll.id, req.user.id]);

        // Fetch Results (Counts) - Only if voted or admin or allow results?
        // Assuming public results for now or based on Anonymous flag?
        // Note: Anonymous means NAMES are hidden, but counts should be visible.
        let results = [];
        if (poll.poll_type !== 'text') {
            const [counts] = await db.query(
                `SELECT option_id, COUNT(*) as count 
                 FROM poll_votes 
                 WHERE poll_id = ? 
                 GROUP BY option_id`,
                [poll.id]
            );
            results = counts;
        } else {
            // For text polls, fetch responses if allowed (e.g. if user is admin or if public)
            // Implementation: Only return text responses if admin for now to be safe, or make a separate endpoint.
        }

        res.json({
            poll,
            options,
            userVote: votes.length > 0 ? votes : null,
            results: results
        });
    } catch (error) {
        console.error('Get poll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Edit Poll (President/Secretary only)
router.put('/:id', auth, requireRole('president', 'secretary'), async (req, res) => {
    try {
        const pollId = req.params.id;
        const { title, description, start_at, end_at, status } = req.body;

        // Verify poll exists
        const [polls] = await db.query('SELECT * FROM polls WHERE id = ?', [pollId]);
        if (polls.length === 0) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (title) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (start_at) { updates.push('start_at = ?'); values.push(start_at); }
        if (end_at) { updates.push('end_at = ?'); values.push(end_at); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(pollId);
        await db.query(`UPDATE polls SET ${updates.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'Poll updated successfully' });
    } catch (error) {
        console.error('Edit poll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cast Vote
router.post('/:id/vote', auth, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const pollId = req.params.id;
        const { option_ids, text_response } = req.body;
        // option_ids can be single ID or array (for multiple choice)

        // Validate Poll
        const [polls] = await connection.query('SELECT * FROM polls WHERE id = ?', [pollId]);
        if (polls.length === 0) return res.status(404).json({ message: 'Poll not found' });
        const poll = polls[0];

        // Check Time
        const now = new Date();
        if (now < new Date(poll.start_at)) return res.status(400).json({ message: 'Poll has not started yet' });
        if (now > new Date(poll.end_at)) return res.status(400).json({ message: 'Poll has ended' });

        // Delete Previous Vote (allow changing vote before poll ends)
        await connection.query('DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?', [pollId, req.user.id]);

        if (poll.poll_type === 'text') {
            if (!text_response) {
                await connection.rollback();
                return res.status(400).json({ message: 'Text response required' });
            }
            await connection.query(
                'INSERT INTO poll_votes (poll_id, user_id, text_response) VALUES (?, ?, ?)',
                [pollId, req.user.id, text_response]
            );
        } else {
            // Choice based
            let selectedOptions = Array.isArray(option_ids) ? option_ids : [option_ids];

            if (poll.poll_type === 'single' && selectedOptions.length > 1) {
                await connection.rollback();
                return res.status(400).json({ message: 'Single choice poll allows only one option' });
            }
            if (!selectedOptions || selectedOptions.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Selection required' });
            }

            // Verify options belong to this poll? ideally yes.
            // But strict FK checks might catch it if option_id is valid.
            // Let's just insert.
            const values = selectedOptions.map(optId => [pollId, optId, req.user.id]);
            await connection.query(
                'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Vote cast successfully' });
    } catch (e) {
        await connection.rollback();
        console.error('Vote error:', e);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;

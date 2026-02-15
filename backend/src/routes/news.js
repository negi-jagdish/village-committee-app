const express = require('express');
const db = require('../config/database');
const { auth, canPostNews } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all news (with reactions count)
router.get('/', auth, async (req, res) => {
    try {
        const { limit = 20, offset = 0, category, scope, sortBy = 'latest' } = req.query;

        let whereClause = '1=1';
        const params = [];

        if (category && category !== 'all') {
            whereClause += ' AND n.category = ?';
            params.push(category);
        }
        if (scope && scope !== 'all') {
            whereClause += ' AND n.scope = ?';
            params.push(scope);
        }

        // Determine order by clause based on sortBy
        let orderClause = 'n.created_at DESC'; // default: latest
        if (sortBy === 'likes') {
            orderClause = 'likes DESC, n.created_at DESC';
        } else if (sortBy === 'views') {
            orderClause = 'COALESCE(n.views, 0) DESC, n.created_at DESC';
        }

        const [news] = await db.query(
            `SELECT n.*, m.name as posted_by_name, m.role as posted_by_role,
       (SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id AND reaction = 'like') as likes,
       (SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id AND reaction = 'love') as loves,
       (SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id AND reaction = 'celebrate') as celebrates
       FROM news n
       LEFT JOIN members m ON n.posted_by = m.id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Get media for each news
        for (const item of news) {
            const [media] = await db.query(
                'SELECT * FROM news_media WHERE news_id = ?',
                [item.id]
            );
            item.media = media;

            // Check if current user has reacted
            const [userReaction] = await db.query(
                'SELECT reaction FROM news_reactions WHERE news_id = ? AND member_id = ?',
                [item.id, req.user.id]
            );
            item.user_reaction = userReaction.length > 0 ? userReaction[0].reaction : null;
        }

        res.json(news);
    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Get single news item
router.get('/:id', auth, async (req, res) => {
    try {
        const [news] = await db.query(
            `SELECT n.*, m.name as posted_by_name, m.role as posted_by_role
       FROM news n
       LEFT JOIN members m ON n.posted_by = m.id
       WHERE n.id = ?`,
            [req.params.id]
        );

        if (news.length === 0) {
            return res.status(404).json({ error: 'News not found' });
        }

        const [media] = await db.query('SELECT * FROM news_media WHERE news_id = ?', [req.params.id]);
        const [reactions] = await db.query(
            `SELECT reaction, COUNT(*) as count FROM news_reactions WHERE news_id = ? GROUP BY reaction`,
            [req.params.id]
        );

        res.json({
            ...news[0],
            media,
            reactions: reactions.reduce((acc, r) => ({ ...acc, [r.reaction]: r.count }), { like: 0, love: 0, celebrate: 0 })
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Post news (reporter/cashier/secretary/president)
router.post('/', auth, canPostNews, upload.array('images', 5), async (req, res) => {
    try {
        const { title, title_hi, content, content_hi, youtube_url, category, scope } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const [result] = await db.query(
            `INSERT INTO news (title, title_hi, content, content_hi, youtube_url, category, scope, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, title_hi || null, content, content_hi || null, youtube_url || null, category || 'general', scope || 'village', req.user.id]
        );

        const newsId = result.insertId;

        // Save uploaded images (Cloudinary URLs)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // If path is a URL (Cloudinary), use it. Otherwise assume local (DiskStorage) and use relative path.
                const mediaUrl = file.path.startsWith('http') ? file.path : '/uploads/' + file.filename;

                await db.query(
                    'INSERT INTO news_media (news_id, media_url, media_type) VALUES (?, ?, ?)',
                    [newsId, mediaUrl, 'image']
                );
            }
        }

        res.status(201).json({ id: newsId, message: 'News posted successfully' });
    } catch (error) {
        console.error('Post news error:', error);
        res.status(500).json({ error: 'Failed to post news' });
    }
});

// Add/Update reaction
router.post('/:id/react', auth, async (req, res) => {
    try {
        const { reaction } = req.body;

        if (!['like', 'love', 'celebrate'].includes(reaction)) {
            return res.status(400).json({ error: 'Invalid reaction type' });
        }

        // Check if user already reacted
        const [existing] = await db.query(
            'SELECT * FROM news_reactions WHERE news_id = ? AND member_id = ?',
            [req.params.id, req.user.id]
        );

        if (existing.length > 0) {
            if (existing[0].reaction === reaction) {
                // Remove reaction if same
                await db.query(
                    'DELETE FROM news_reactions WHERE news_id = ? AND member_id = ?',
                    [req.params.id, req.user.id]
                );
                return res.json({ message: 'Reaction removed' });
            } else {
                // Update reaction
                await db.query(
                    'UPDATE news_reactions SET reaction = ? WHERE news_id = ? AND member_id = ?',
                    [reaction, req.params.id, req.user.id]
                );
                return res.json({ message: 'Reaction updated' });
            }
        }

        // Add new reaction
        await db.query(
            'INSERT INTO news_reactions (news_id, member_id, reaction) VALUES (?, ?, ?)',
            [req.params.id, req.user.id, reaction]
        );

        res.json({ message: 'Reaction added' });
    } catch (error) {
        console.error('React error:', error);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
});

// Delete news (only poster or president)
router.delete('/:id', auth, async (req, res) => {
    try {
        const [news] = await db.query('SELECT * FROM news WHERE id = ?', [req.params.id]);

        if (news.length === 0) {
            return res.status(404).json({ error: 'News not found' });
        }

        if (news[0].posted_by !== req.user.id && req.user.role !== 'president') {
            return res.status(403).json({ error: 'Not authorized to delete this news' });
        }

        await db.query('DELETE FROM news WHERE id = ?', [req.params.id]);
        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete news' });
    }
});

// Edit news (only poster can edit)
router.put('/:id', auth, async (req, res) => {
    try {
        const [news] = await db.query('SELECT * FROM news WHERE id = ?', [req.params.id]);

        if (news.length === 0) {
            return res.status(404).json({ error: 'News not found' });
        }

        if (news[0].posted_by !== req.user.id) {
            return res.status(403).json({ error: 'Only the original poster can edit this news' });
        }

        const { title, title_hi, content, content_hi, youtube_url, category, scope } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        await db.query(
            `UPDATE news SET title = ?, title_hi = ?, content = ?, content_hi = ?, youtube_url = ?, category = ?, scope = ? WHERE id = ?`,
            [title, title_hi || null, content, content_hi || null, youtube_url || null, category || 'general', scope || 'village', req.params.id]
        );

        res.json({ message: 'News updated successfully' });
    } catch (error) {
        console.error('Edit news error:', error);
        res.status(500).json({ error: 'Failed to update news' });
    }
});

module.exports = router;

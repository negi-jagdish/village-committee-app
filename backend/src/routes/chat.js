const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Ensure this exists and is configured

// All routes require authentication
router.use(auth);

// Chat Listing and Messages
router.get('/list', chatController.getChatList);
router.get('/:groupId/messages', chatController.getMessages);
router.post('/update-token', chatController.updateToken);

// Send Message (Text)
router.post('/:groupId/message', chatController.sendMessage);

// Upload Media
router.post('/upload', upload.single('file'), chatController.uploadMedia);

// Create Group/DM
router.post('/group', chatController.createGroup);

// Broadcast (Admin Only)
router.post('/broadcast', chatController.broadcast);

// Message Actions
router.delete('/message/:messageId', chatController.deleteMessage);
router.post('/message/:messageId/react', chatController.reactToMessage);
router.get('/message/:messageId/reactions', chatController.getMessageReactions);


// Group Management
router.get('/:groupId', chatController.getGroupDetails);
router.put('/:groupId', chatController.updateGroupDetails);
router.post('/:groupId/members', chatController.addGroupMembers);
router.delete('/:groupId/members/:memberId', chatController.removeGroupMember);
router.put('/:groupId/members/:memberId/role', chatController.updateMemberRole);
router.post('/:groupId/leave', chatController.leaveGroup);

module.exports = router;

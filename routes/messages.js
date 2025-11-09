const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');

// POST /api/messages/:recipientId -> mesaj gönder
router.post('/:recipientId', auth, async (req, res) => {
  try {
    const recipientId = req.params.recipientId;
    const currentUserId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ error: 'Message content is required.' });
    }

    if (recipientId === currentUserId) {
      return res
        .status(400)
        .json({ error: 'You cannot send a message to yourself.' });
    }

    const recipient = await User.findById(recipientId).select(
      '_id username'
    );
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const message = await Message.create({
      sender: currentUserId,
      recipient: recipientId,
      content: content.trim(),
    });

    return res.status(201).json({
      message: 'Message sent.',
      data: {
        id: message._id,
        senderId: currentUserId,
        recipientId: recipientId,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/messages/conversation/:userId -> iki kullanıcı arasındaki sohbet
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;

    const otherUser = await User.findById(otherUserId).select(
      '_id username email createdAt'
    );
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    const data = messages.map((m) => ({
      id: m._id,
      fromSelf: m.sender.toString() === currentUserId,
      content: m.content,
      createdAt: m.createdAt,
    }));

    return res.json({
      withUser: {
        id: otherUser._id,
        username: otherUser.username,
        email: otherUser.email,
        createdAt: otherUser.createdAt,
      },
      count: data.length,
      messages: data,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

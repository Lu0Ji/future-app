const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Prediction = require('../models/Prediction');

// GET /api/users -> kullanıcı arama / listeleme
// Örnek: /api/users?q=al   (username'de "al" geçenler)
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const currentUserId = req.user.id;

    const filter = {};

    if (q.length > 0) {
      // username içinde arama (büyük-küçük harf duyarsız)
      filter.username = { $regex: q, $options: 'i' };
    }

    // Kendimizi de görebiliriz, sorun yok, sadece şimdilik hepsini 20 ile sınırlayalım
    const users = await User.find(filter)
      .select('_id username email createdAt')
      .sort({ username: 1 })
      .limit(20);

    const data = [];

    for (const user of users) {
      // Bu kullanıcıyı takip ediyor muyuz?
      const isFollowing = await Follow.exists({
        follower: currentUserId,
        following: user._id,
      });

      data.push({
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        isMe: user._id.toString() === currentUserId,
        isFollowing: !!isFollowing,
      });
    }

    return res.json({
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/:id -> kullanıcının profil özeti
router.get('/:id', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const user = await User.findById(targetUserId).select(
      '_id username email createdAt'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Takipçi / takip edilen sayıları
    const [followerCount, followingCount, predictionCount, isFollowing] =
      await Promise.all([
        Follow.countDocuments({ following: targetUserId }),
        Follow.countDocuments({ follower: targetUserId }),
        Prediction.countDocuments({ user: targetUserId }),
        Follow.exists({
          follower: currentUserId,
          following: targetUserId,
        }),
      ]);

    return res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      followerCount,
      followingCount,
      predictionCount,
      isMe: user._id.toString() === currentUserId,
      isFollowing: !!isFollowing,
    });
  } catch (error) {
    console.error('User profile error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

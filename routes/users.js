const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Prediction = require('../models/Prediction');

// GET /api/users/me - mevcut kullanıcının özeti (şimdilik frontend kullanmasa da dursun)
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('_id username email createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [predictionCount, followerCount, followingCount] = await Promise.all([
      Prediction.countDocuments({ user: userId }),
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);

    return res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      predictionCount,
      followerCount,
      followingCount,
      isMe: true,
      isFollowing: false,
    });
  } catch (err) {
    console.error('Get /users/me error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/:id/predictions -> profil için AÇILMIŞ tahminler
router.get('/:id/predictions', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('_id username');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const allPredictions = await Prediction.find({ user: userId })
      .sort({ targetDate: -1, createdAt: -1 })
      .lean();

    const todayStr = new Date().toISOString().split('T')[0];

    // Sadece hedef tarihi bugüne kadar gelmiş olanlar (mühür kalkmış olanlar)
    const opened = allPredictions.filter((p) => {
      if (!p.targetDate) return false;
      const targetStr = p.targetDate.toISOString().split('T')[0];
      return targetStr <= todayStr;
    });

    const data = opened.map((p) => ({
      id: p._id,
      title: p.title || null,
      content: p.content,
      category: p.category,
      targetDate: p.targetDate
        ? p.targetDate.toISOString().split('T')[0]
        : null,
      createdAt: p.createdAt
        ? p.createdAt.toISOString().split('T')[0]
        : null,
      status: p.status || 'pending',
      resolvedAt: p.resolvedAt || null,
    }));


    return res.json({
      userId: user._id,
      username: user.username,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('Get user predictions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/:id -> profil özeti
router.get('/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentUserId = req.user.id;

    const user = await User.findById(targetId).select(
      '_id username email createdAt'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [predictionCount, followerCount, followingCount, followRelation] =
      await Promise.all([
        Prediction.countDocuments({ user: targetId }),
        Follow.countDocuments({ following: targetId }),
        Follow.countDocuments({ follower: targetId }),
        Follow.findOne({
          follower: currentUserId,
          following: targetId,
        }),
      ]);

    const isMe = currentUserId === user._id.toString();
    const isFollowing = !!followRelation;

    return res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      predictionCount,
      followerCount,
      followingCount,
      isMe,
      isFollowing,
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

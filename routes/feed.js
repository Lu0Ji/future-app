const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const Follow = require('../models/Follow');

// GET /api/feed -> takip ettiklerinin (ve kendinin) tahminleri
// Gelecekteki tahminler: isLocked = true, content = null
router.get('/', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // 1) Bu kullanıcı kimi takip ediyor?
    const relations = await Follow.find({ follower: currentUserId }).select(
      'following'
    );

    const followedIds = relations.map((rel) => rel.following.toString());
    

    // 2) Kendimizi de feed'e ekleyelim
    if (!followedIds.includes(currentUserId)) {
      followedIds.push(currentUserId);
    }

    // Hiç kimseyi takip etmiyorsa ve kendisi de yoksa (çok düşük ihtimal)
    if (followedIds.length === 0) {
      return res.json({
        userId: currentUserId,
        username: req.user.username,
        count: 0,
        data: [],
      });
    }

    // 3) Bu kullanıcıların tüm tahminlerini çek
    const predictions = await Prediction.find({
      user: { $in: followedIds },
    })
      .populate('user', 'username')
      .sort({ targetDate: 1, createdAt: -1 });

    const todayStr = new Date().toISOString().split('T')[0];

    // 4) Her tahmini mühür durumuna göre dön
      const data = predictions.map((p) => {
      const targetStr = p.targetDate.toISOString().split('T')[0];
      const isLocked = targetStr > todayStr; // gelecekteyse mühürlü

      return {
        id: p._id,
        userId: p.user._id,
        username: p.user.username,
        category: p.category,
        title: p.title || '',
        // Mühürlü ise içerik HİÇ gönderilmiyor:
        content: isLocked ? null : p.content,
        isLocked,
        targetDate: targetStr,
        createdAt: p.createdAt,
        status: p.status || 'pending',
        resolvedAt: p.resolvedAt || null,
        likesCount: p.likesCount || (p.likedBy || []).length || 0,
        liked: p.likedBy
        ? p.likedBy.some((u) => u.toString() === req.user.id.toString())
        : false,
      };
    });

    return res.json({
      userId: currentUserId,
      username: req.user.username,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Feed error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

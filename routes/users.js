// routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Follow = require('../models/Follow');

// GET /api/users/explore -> diğer kullanıcıları listele (keşfet)
router.get('/explore', auth, async (req, res) => {
  try {
    const meId = req.user.id;

    // Kendimiz hariç son kayıt olan kullanıcılar
    const users = await User.find({ _id: { $ne: meId } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Takip ettiklerimizi bul
    const follows = await Follow.find({ follower: meId })
      .select('following')
      .lean();

    const followingSet = new Set(follows.map((f) => String(f.following)));

    const data = users.map((u) => ({
      id: String(u._id),
      username: u.username,
      joinedAt: u.createdAt
        ? u.createdAt.toISOString().split('T')[0]
        : '',
      isFollowing: followingSet.has(String(u._id)),
    }));

    res.json({ data });
  } catch (err) {
    console.error('users explore error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/users/:id  -> Profil verisi + son tahminler
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('username email createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSelf = String(req.user.id) === String(user._id);

    // Takip ediyor muyuz?
    const isFollowing = await Follow.exists({
      follower: req.user.id,
      following: id,
    });

    // Genel istatistikler
    const [total, correct, incorrect, resolved] = await Promise.all([
      Prediction.countDocuments({ user: id }),
      Prediction.countDocuments({ user: id, status: 'correct' }),
      Prediction.countDocuments({ user: id, status: 'incorrect' }),
      Prediction.countDocuments({
        user: id,
        status: { $in: ['correct', 'incorrect'] },
      }),
    ]);

    const accuracy =
      resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

    // Tahminler
    const todayStr = new Date().toISOString().split('T')[0];

    const preds = await Prediction.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const data = preds.map((p) => {
      const targetStr = p.targetDate
        ? p.targetDate.toISOString().split('T')[0]
        : '';
      const createdStr = p.createdAt
        ? p.createdAt.toISOString().split('T')[0]
        : '';

      // Hedef tarihi bugünden büyükse mühürlü kabul et
      const isLocked =
        targetStr && new Date(targetStr) > new Date(todayStr);

      const likesCount = p.likesCount || 0;
      const liked =
        Array.isArray(p.likedBy) &&
        p.likedBy.some(
          (uid) => String(uid) === String(req.user.id)
        );

      return {
        id: String(p._id),
        category: p.category,
        targetDate: targetStr,
        createdAt: createdStr,
        status: p.status || 'pending',
        // Başlık: her zaman gönder, UI isterse gösterir
        title: p.title || '',
        // İçerik: mühürlü ise null, açılmışsa içerik
        content: isLocked ? null : p.content || '',
        isLocked,
        likesCount,
        liked,
      };
    });

    return res.json({
      user: {
        id: String(user._id),
        username: user.username,
        joinedAt:
          (user.createdAt &&
            user.createdAt.toISOString().split('T')[0]) ||
          '',
      },
      isSelf,
      isFollowing: !!isFollowing,
      stats: { total, resolved, correct, incorrect, accuracy },
      predictions: data,
    });
  } catch (err) {
    console.error('User profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

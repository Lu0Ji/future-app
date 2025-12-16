const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');

// POST /api/follow/:targetUserId -> bir kullanıcıyı takip et
router.post('/:targetUserId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.targetUserId;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res
        .status(400)
        .json({ error: 'You cannot follow yourself.' });
    }

    // Hedef kullanıcı var mı?
    const targetUser = await User.findById(targetUserId).select('_id username');
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // Zaten takip ediyor mu?
    const existing = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId,
    });

    if (existing) {
      return res.json({
        message: 'Already following this user.',
      });
    }

    await Follow.create({
      follower: currentUserId,
      following: targetUserId,
    });

    return res.status(201).json({
      message: 'Now following user.',
      target: {
        id: targetUser._id,
        username: targetUser.username,
      },
    });
  } catch (error) {
    console.error('Follow error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/follow/:targetUserId -> takipten çık
router.delete('/:targetUserId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.targetUserId;
    const currentUserId = req.user.id;

    const result = await Follow.deleteOne({
      follower: currentUserId,
      following: targetUserId,
    });

    // result.deletedCount 0 olsa bile "artık takip etmiyorsun" diyebiliriz
    return res.json({
      message: 'Unfollowed (if follow existed).',
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/follow/following -> ben kimi takip ediyorum?
router.get('/following', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const relations = await Follow.find({ follower: currentUserId })
      .populate('following', 'username email')
      .sort({ createdAt: -1 });

    const data = relations
  .filter((rel) => rel.following) // null ise atla
  .map((rel) => ({
    id: rel.following._id,
    username: rel.following.username,
    email: rel.following.email,
    followedAt: rel.createdAt,
  }));


    return res.json({
      userId: currentUserId,
      username: req.user.username,
      count: data.length,
      following: data,
    });
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/follow/followers -> beni kimler takip ediyor?
router.get('/followers', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const relations = await Follow.find({ following: currentUserId })
      .populate('follower', 'username email')
      .sort({ createdAt: -1 });

    const data = relations
  .filter((rel) => rel.following) // null ise atla
  .map((rel) => ({
    id: rel.following._id,
    username: rel.following.username,
    email: rel.following.email,
    followedAt: rel.createdAt,
  }));


    return res.json({
      userId: currentUserId,
      username: req.user.username,
      count: data.length,
      followers: data,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Takip istatistikleri: Ben kaç kişiyi takip ediyorum, beni kaç kişi takip ediyor
router.get('/me-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Benim takip ettiklerim
    const followingCount = await Follow.countDocuments({ follower: userId });
    // Beni takip edenler
    const followersCount = await Follow.countDocuments({ following: userId });

    res.json({
      followingCount,
      followersCount,
    });
  } catch (err) {
    console.error('follow /me-stats error:', err);
    res.status(500).json({ error: 'Follow stats error' });
  }
});

// Belirli bir kullanıcı için takip istatistikleri (ID ile)
// GET /api/follow/user/:id/stats
router.get('/user/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user._id;

    const followingCount = await Follow.countDocuments({ follower: userId });
    const followersCount = await Follow.countDocuments({ following: userId });

    return res.json({ followingCount, followersCount });
  } catch (err) {
    console.error('follow user id stats error:', err);
    return res.status(500).json({ error: 'Follow stats error' });
  }
});

// Belirli bir kullanıcı için takip istatistikleri
// GET /api/follow/user/:username/stats
router.get('/user/:username/stats', auth, async (req, res) => {
  try {
    const username = req.params.username;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user._id;

    const followingCount = await Follow.countDocuments({ follower: userId });
    const followersCount = await Follow.countDocuments({ following: userId });

    res.json({
      followingCount,
      followersCount,
    });
  } catch (err) {
    console.error('follow user stats error:', err);
    res.status(500).json({ error: 'Follow stats error' });
  }
});

// Belirli bir kullanıcı için takip istatistikleri (ID ile)
// GET /api/follow/user/:id/stats
router.get('/user/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user._id;

    const followingCount = await Follow.countDocuments({ follower: userId });
    const followersCount = await Follow.countDocuments({ following: userId });

    return res.json({ followingCount, followersCount });
  } catch (err) {
    console.error('follow user id stats error:', err);
    return res.status(500).json({ error: 'Follow stats error' });
  }
});

module.exports = router;

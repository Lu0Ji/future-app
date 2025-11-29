const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');

// GET /api/leaderboard -> kategori bazlı liderlik tablosu
router.get('/', auth, async (req, res) => {
  try {
    const category = req.query.category;
    const minResolved = Number(req.query.minResolved || 10);

    const match = {
      status: { $in: ['correct', 'incorrect'] },
    };

    if (category) {
      match.category = category;
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$user',
          resolvedCount: { $sum: 1 },
          correctCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'correct'] }, 1, 0],
            },
          },
          lastResolvedAt: { $max: '$resolvedAt' },
        },
      },
      {
        $match: {
          resolvedCount: { $gte: minResolved },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          username: '$user.username',
          resolvedCount: 1,
          correctCount: 1,
          accuracy: {
            $cond: [
              { $gt: ['$resolvedCount', 0] },
              { $divide: ['$correctCount', '$resolvedCount'] },
              0,
            ],
          },
          lastResolvedAt: 1,
        },
      },
      {
        $sort: {
          accuracy: -1,
          resolvedCount: -1,
          lastResolvedAt: -1,
        },
      },
      { $limit: 50 },
    ];

    const results = await Prediction.aggregate(pipeline);

    const formatted = results.map((r) => ({
      userId: r.userId,
      username: r.username,
      resolvedCount: r.resolvedCount,
      correctCount: r.correctCount,
      accuracy: Math.round((r.accuracy || 0) * 100),
      lastResolvedAt: r.lastResolvedAt,
    }));

    return res.json({ data: formatted });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

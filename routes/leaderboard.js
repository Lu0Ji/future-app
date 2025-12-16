const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const User = require('../models/User');

// GET /api/leaderboard
// Örnek: /api/leaderboard?category=sports&minResolved=3
router.get('/', auth, async (req, res) => {
  try {
    const { category, minResolved } = req.query;

    // minResolved gelmezse 0 kabul et (herkes listeye girebilsin)
    let minResolvedNum = 0;
    if (minResolved !== undefined && minResolved !== '') {
      const parsed = Number(minResolved);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        minResolvedNum = parsed;
      }
    }

    // Sadece çözülmüş tahminler (doğru / yanlış)
    const match = {
      status: { $in: ['correct', 'incorrect'] },
    };

    // Kategori filtresi (all gelirse hepsini göster)
    if (category && category !== 'all') {
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
        },
      },
      {
        $addFields: {
          // 0–100 arası yüzde
          accuracy: {
            $cond: [
              { $gt: ['$resolvedCount', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ['$correctCount', '$resolvedCount'],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          resolvedCount: { $gte: minResolvedNum },
        },
      },
      {
        $sort: {
          accuracy: -1,
          resolvedCount: -1,
        },
      },
      {
        $limit: 50,
      },
    ];

    const aggResult = await Prediction.aggregate(pipeline);

    // Kullanıcı adlarını çek
    const userIds = aggResult.map((r) => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username')
      .lean();

    const userMap = new Map();
    users.forEach((u) => {
      userMap.set(String(u._id), u);
    });

    const formatted = aggResult.map((r) => {
      const user = userMap.get(String(r._id));
      return {
        userId: String(r._id),
        username: user?.username || 'Bilinmiyor',
        resolvedCount: r.resolvedCount,
        correctCount: r.correctCount,
        accuracy: r.accuracy, // % olarak
      };
    });

    // 🔴 ÖNEMLİ: Frontend `data.data` bekliyor → o yüzden "data" anahtarıyla dönüyoruz
    return res.json({ data: formatted });
  } catch (error) {
    console.error('leaderboard error:', error);
    return res
      .status(500)
      .json({ error: 'Liderlik tablosu alınırken bir hata oluştu.' });
  }
});

module.exports = router;

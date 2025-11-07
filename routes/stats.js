const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const categories = require('../config/categories');

// GET /api/stats/me -> login olan kullanıcının kategori bazlı istatistikleri
router.get('/me', auth, async (req, res) => {
  try {
    // BU KULLANICININ TÜM TAHMİNLERİ
    const predictions = await Prediction.find({ user: req.user.id });

    // Debug için istersen şunları bir kere görebilirsin:
    // console.log('Stats for user:', req.user.id);
    // console.log('Found predictions:', predictions.length);

    const statsByCategory = {};

    categories.forEach((cat) => {
      statsByCategory[cat.key] = {
        key: cat.key,
        label: cat.label,
        total: 0,
        resolved: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      };
    });

    predictions.forEach((p) => {
      const key = p.category;
      if (!statsByCategory[key]) return; // listede olmayan kategori ise atla

      const catStats = statsByCategory[key];

      catStats.total += 1;

      const status = p.status || 'pending';

      if (status === 'correct' || status === 'incorrect') {
        catStats.resolved += 1;
        if (status === 'correct') {
          catStats.correct += 1;
        } else {
          catStats.incorrect += 1;
        }
      }
    });

    Object.values(statsByCategory).forEach((catStats) => {
      if (catStats.resolved > 0) {
        catStats.accuracy = Math.round(
          (catStats.correct / catStats.resolved) * 100
        );
      } else {
        catStats.accuracy = 0;
      }
    });

    return res.json({
      userId: req.user.id,
      username: req.user.username,
      categories: Object.values(statsByCategory),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

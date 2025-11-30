const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const categories = require('../config/categories');

// Ortak: kategori stats objesi oluştur
function createEmptyCategoryStats() {
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
  return statsByCategory;
}

// Ortak: verilen tahmin listesine göre kategori stats doldur
function fillCategoryStats(statsByCategory, predictions) {
  predictions.forEach((p) => {
    const status = p.status || 'pending';
    const key = p.category;
    const catStats = statsByCategory[key];
    if (!catStats) return;

    catStats.total += 1;

    if (status === 'correct' || status === 'incorrect') {
      catStats.resolved += 1;
      if (status === 'correct') {
        catStats.correct += 1;
      } else {
        catStats.incorrect += 1;
      }
    }
  });

  Object.values(statsByCategory).forEach((c) => {
    if (c.resolved > 0) {
      c.accuracy = Math.round((c.correct / c.resolved) * 100);
    } else {
      c.accuracy = 0;
    }
  });
}

// GET /api/stats/me -> giriş yapmış kullanıcının genel + kategori bazlı istatistikleri
router.get('/me', auth, async (req, res) => {
  try {
    const userId = (req.user && req.user.id) || req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const predictions = await Prediction.find({ user: userId }).lean();

    let total = 0;
    let resolved = 0;
    let correct = 0;
    let incorrect = 0;

    predictions.forEach((p) => {
      const status = p.status || 'pending';
      total += 1;

      if (status === 'correct' || status === 'incorrect') {
        resolved += 1;
        if (status === 'correct') {
          correct += 1;
        } else {
          incorrect += 1;
        }
      }
    });

    const statsByCategory = createEmptyCategoryStats();
    fillCategoryStats(statsByCategory, predictions);

    const accuracy =
      resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

    return res.json({
      total,
      resolved,
      correct,
      incorrect,
      accuracy,
      categories: Object.values(statsByCategory),
    });
  } catch (error) {
    console.error('Stats /me error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/stats/user/:id -> herhangi bir kullanıcının kategori bazlı istatistikleri
router.get('/user/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const predictions = await Prediction.find({ user: userId }).lean();

    const statsByCategory = createEmptyCategoryStats();
    fillCategoryStats(statsByCategory, predictions);

    return res.json({
      userId,
      categories: Object.values(statsByCategory),
    });
  } catch (error) {
    console.error('Stats /user/:id error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

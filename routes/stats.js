const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const categories = require('../config/categories');
const mongoose = require('mongoose');

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

// Belirli bir kullanıcı için kategori bazlı istatistik
router.get('/user/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const predictions = await Prediction.find({ user: userId }).lean();

    const statsByCategory = {};

    predictions.forEach(p => {
      const cat = p.category || 'uncategorized';
      if (!statsByCategory[cat]) {
        statsByCategory[cat] = {
          category: cat,
          total: 0,
          resolved: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0,
        };
      }

      statsByCategory[cat].total += 1;

      if (p.status === 'correct' || p.status === 'incorrect') {
        statsByCategory[cat].resolved += 1;
      }
      if (p.status === 'correct') {
        statsByCategory[cat].correct += 1;
      }
      if (p.status === 'incorrect') {
        statsByCategory[cat].incorrect += 1;
      }
    });

    // accuracy hesapla
    Object.values(statsByCategory).forEach(s => {
      if (s.resolved > 0) {
        s.accuracy = Math.round((s.correct / s.resolved) * 100);
      } else {
        s.accuracy = 0;
      }
    });

    res.json(Object.values(statsByCategory));
  } catch (err) {
    console.error('Error in /stats/user/:id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/stats/user/:id -> belirli bir kullanıcının kategori bazlı istatistikleri
router.get('/user/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Kullanıcı var mı diye hafif bir kontrol (zorunlu değil ama güzel)
    const userDoc = await User.findById(userId).select('username').lean();

    // Bu kullanıcının tüm tahminleri
    const predictions = await Prediction.find({ user: userId });

    const statsByCategory = {};

    // Bütün kategorileri başlangıç değeri 0 olacak şekilde hazırla
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

    // Tahminlere göre sayıları doldur
    predictions.forEach((p) => {
      const key = p.category;
      if (!statsByCategory[key]) return; // config'te olmayan kategori ise atla

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

    // Yüzdeleri hesapla
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
      userId,
      username: userDoc ? userDoc.username : '',
      categories: Object.values(statsByCategory),
    });
  } catch (error) {
    console.error('Stats /user/:id error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

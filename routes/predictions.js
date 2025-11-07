const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const categories = require('../config/categories');

const allowedCategoryKeys = categories.map((c) => c.key);

// POST /api/predictions -> tahmin oluşturma (sadece login kullanıcı)
router.post('/', auth, async (req, res) => {
  try {
    const { content, targetDate, category } = req.body;

    if (!content || !targetDate || !category) {
      return res
        .status(400)
        .json({ error: 'Content, targetDate and category are required.' });
    }

    if (!allowedCategoryKeys.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // targetDate "YYYY-MM-DD" formatında geliyor (input[type="date"])
    if (targetDate < todayStr) {
      return res
        .status(400)
        .json({ error: 'Target date must be today or in the future.' });
    }

    const target = new Date(targetDate);

    const prediction = await Prediction.create({
      user: req.user.id,
      category,
      content,
      targetDate: target,
    });

    return res.status(201).json({
      message: 'Prediction created',
      data: {
        id: prediction._id,
        userId: req.user.id,
        username: req.user.username,
        category,
        content: prediction.content,
        targetDate,
        createdAt: prediction.createdAt,
        status: prediction.status,
      },
    });
  } catch (error) {
    console.error('Create prediction error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/predictions/mine -> login kullanıcının tüm tahminleri
router.get('/mine', auth, async (req, res) => {
  try {
    const { status, category } = req.query;

    const filter = { user: req.user.id };

    // Duruma göre filtre
    if (status && ['pending', 'correct', 'incorrect'].includes(status)) {
      filter.status = status;
    }

    // Kategoriye göre filtre (isteğe bağlı)
    if (category && allowedCategoryKeys.includes(category)) {
      filter.category = category;
    }

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 });

    const data = predictions.map((p) => ({
      id: p._id,
      category: p.category,
      content: p.content,
      targetDate: p.targetDate.toISOString().split('T')[0],
      createdAt: p.createdAt,
      status: p.status || 'pending',
      resolvedAt: p.resolvedAt || null,
    }));

    return res.json({
      userId: req.user.id,
      username: req.user.username,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Get my predictions error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


// GET /api/predictions -> sadece TARİHİ GELMİŞ tahminler (herkese açık)
router.get('/', async (req, res) => {
  try {
    // Tüm tahminleri al
    const predictions = await Prediction.find()
      .populate('user', 'username')
      .sort({ targetDate: 1 });

    // Bugünün tarihini string olarak al (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // Sadece tarihi bugünden küçük/eşit olanları göster
    const visible = predictions.filter((p) => {
      const targetStr = p.targetDate.toISOString().split('T')[0];
      return targetStr <= todayStr;
    });

    const data = visible.map((p) => ({
      id: p._id,
      userId: p.user._id,
      username: p.user.username,
      category: p.category,
      content: p.content,
      targetDate: p.targetDate.toISOString().split('T')[0],
      createdAt: p.createdAt,
      status: p.status || 'pending',
      resolvedAt: p.resolvedAt || null,
    }));

    return res.json({
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/predictions/:id/resolve -> tahmini doğru/yanlış işaretle
router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['correct', 'incorrect'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Status must be "correct" or "incorrect".' });
    }

    const prediction = await Prediction.findById(req.params.id);

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    // Sadece sahibi çözebilsin
    if (prediction.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'You are not allowed to modify this prediction.' });
    }

    // Hedef tarih gelmeden çözmeye izin verme
    const todayStr = new Date().toISOString().split('T')[0];
    const targetStr = prediction.targetDate.toISOString().split('T')[0];

    if (targetStr > todayStr) {
      return res
        .status(400)
        .json({ error: 'Prediction cannot be resolved before target date.' });
    }

    prediction.status = status;
    prediction.resolvedAt = new Date();

    await prediction.save();

    return res.json({
      message: 'Prediction resolved.',
      data: {
        id: prediction._id,
        status: prediction.status,
        resolvedAt: prediction.resolvedAt,
      },
    });
  } catch (error) {
    console.error('Resolve prediction error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

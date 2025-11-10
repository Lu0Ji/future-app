const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const categoriesConfig = require('../config/categories');

const allowedCategoryKeys = categoriesConfig.map((c) => c.key);

// Ortak helper: mühürlü mü?
function isLocked(prediction) {
  if (!prediction.targetDate) return true;
  const todayStr = new Date().toISOString().split('T')[0];
  const targetStr = prediction.targetDate.toISOString().split('T')[0];
  return targetStr > todayStr;
}

// POST /api/predictions  -> tahmin oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, targetDate, category } = req.body;

    if (!title || !title.trim() || !content || !content.trim() || !targetDate || !category) {
      return res
        .status(400)
        .json({ error: 'Title, content, targetDate ve category zorunlu.' });
    }

    if (!allowedCategoryKeys.includes(category)) {
      return res.status(400).json({ error: 'Geçersiz kategori.' });
    }

    const target = new Date(targetDate);
    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({ error: 'targetDate formatı geçersiz.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetStr = target.toISOString().split('T')[0];
    if (targetStr < todayStr) {
      return res.status(400).json({
        error: 'Hedef tarih bugün veya gelecek bir gün olmalı.',
      });
    }

    const prediction = await Prediction.create({
      user: req.user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      targetDate: target,
    });

    return res.status(201).json({
      message: 'Prediction created.',
      data: {
        id: prediction._id,
        title: prediction.title,
        content: prediction.content,
        category: prediction.category,
        targetDate: prediction.targetDate.toISOString().split('T')[0],
        status: prediction.status,
        createdAt: prediction.createdAt,
      },
    });
  } catch (err) {
    console.error('Create prediction error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/predictions/mine  -> benim tahminlerim (filtreli)
router.get('/mine', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { category, status } = req.query;

    const filter = { user: currentUserId };

    if (category && allowedCategoryKeys.includes(category)) {
      filter.category = category;
    }

    if (status && ['pending', 'correct', 'incorrect'].includes(status)) {
      filter.status = status;
    }

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const todayStr = new Date().toISOString().split('T')[0];

    const data = predictions.map((p) => {
      const targetStr = p.targetDate
        ? p.targetDate.toISOString().split('T')[0]
        : null;
      const locked = targetStr ? targetStr > todayStr : true;

      return {
        id: p._id,
        // Mühürlü ise başlık ve içerik yok
        title: locked ? null : (p.title || null),
        content: locked ? null : p.content,
        category: p.category,
        targetDate: targetStr,
        createdAt: p.createdAt,
        status: p.status || 'pending',
        isLocked: locked,
        resolvedAt: p.resolvedAt || null,
      };
    });

    return res.json({
      userId: currentUserId,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('Get my predictions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/predictions/:id  -> detay endpoint
router.get('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;

    const prediction = await Prediction.findById(id)
      .populate('user', '_id username email createdAt')
      .lean();

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const locked = isLocked(prediction);

    const targetStr = prediction.targetDate
      ? prediction.targetDate.toISOString().split('T')[0]
      : null;

    return res.json({
      id: prediction._id,
      user: prediction.user
        ? {
            id: prediction.user._id,
            username: prediction.user.username,
            email: prediction.user.email,
            createdAt: prediction.user.createdAt,
          }
        : null,
      title: locked ? null : (prediction.title || null),
      content: locked ? null : prediction.content,
      category: prediction.category,
      targetDate: targetStr,
      createdAt: prediction.createdAt,
      status: prediction.status || 'pending',
      resolvedAt: prediction.resolvedAt || null,
      isLocked: locked,
    });
  } catch (err) {
    console.error('Get prediction detail error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/predictions/:id/resolve -> doğru / yanlış işaretleme
router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const currentUserId = req.user.id;
    const { status } = req.body;

    if (!['correct', 'incorrect'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Status "correct" veya "incorrect" olmalı.' });
    }

    const prediction = await Prediction.findOne({
      _id: id,
      user: currentUserId,
    });

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetStr = prediction.targetDate
      ? prediction.targetDate.toISOString().split('T')[0]
      : null;

    if (!targetStr || targetStr > todayStr) {
      return res.status(400).json({
        error: 'Hedef tarihi gelmeden tahmini çözemezsiniz.',
      });
    }

    if (prediction.status !== 'pending') {
      return res
        .status(400)
        .json({ error: 'Bu tahmin zaten çözülmüş.' });
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
  } catch (err) {
    console.error('Resolve prediction error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

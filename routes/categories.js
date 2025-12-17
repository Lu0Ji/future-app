const express = require('express');
const router = express.Router();
const categories = require('../config/categories');
const Prediction = require('../models/Prediction');

const auth = require('../middleware/auth');
const Category = require('../models/Category');

function normalizeCategory(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 50);
}

function normalizedKey(label) {
  return normalizeCategory(label).toLowerCase();
}


// GET /api/categories  -> sabit kategoriler + kullanıcının ürettiği kategoriler
// GET /api/categories -> sabit kategoriler + approved custom kategoriler
router.get('/', async (req, res) => {
  try {
    const base = categories || [];
    const baseKeys = new Set(base.map((c) => String(c.key)));

    const approved = await Category.find({ status: 'approved' })
      .select('label normalized')
      .sort({ label: 1 })
      .lean();

    const custom = (approved || [])
      .map((c) => ({ key: c.label, label: c.label }))
      .filter((c) => c.key && !baseKeys.has(c.key));

    const merged = [...base, ...custom];

    return res.json({ count: merged.length, data: merged });
  } catch (err) {
    console.error('categories get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/categories/suggest -> kategori öner
router.post('/suggest', auth, async (req, res) => {
  try {
    const label = normalizeCategory(req.body.label);
    if (!label || label.length < 2) {
      return res.status(400).json({ error: 'Kategori 2-50 karakter olmalı.' });
    }

    // basit karakter kontrolü (geliştirilebilir)
    if (!/^[\p{L}\p{N} _.\-&]+$/u.test(label)) {
      return res.status(400).json({ error: 'Kategori geçersiz karakter içeriyor.' });
    }

    const key = normalizedKey(label);

    // varsa getir, yoksa pending oluştur
    const existing = await Category.findOne({ normalized: key }).lean();
    if (existing) {
      return res.json({ status: existing.status, label: existing.label });
    }

    await Category.create({
      label,
      normalized: key,
      status: 'pending',
      createdBy: req.userId,
      votesUp: [req.userId], // başlangıç oyu (ileride otomatik onaya yarar)
    });

    return res.json({ status: 'pending', label });
  } catch (err) {
    console.error('categories suggest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/categories/pending -> pending kategorileri getir (şimdilik auth yeterli; ileride role ekleriz)
router.get('/pending', auth, async (req, res) => {
  try {
    const pending = await Category.find({ status: 'pending' })
      .select('label createdAt votesUp votesDown')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: pending.length,
      data: pending.map((c) => ({
        label: c.label,
        up: (c.votesUp || []).length,
        down: (c.votesDown || []).length,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error('categories pending error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/categories/:label/approve
router.post('/:label/approve', auth, async (req, res) => {
  try {
    const label = normalizeCategory(req.params.label);
    const key = normalizedKey(label);

    const updated = await Category.findOneAndUpdate(
      { normalized: key },
      { $set: { status: 'approved', label } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Kategori bulunamadı.' });

    return res.json({ ok: true, label: updated.label, status: updated.status });
  } catch (err) {
    console.error('categories approve error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/categories/:label/reject
router.post('/:label/reject', auth, async (req, res) => {
  try {
    const label = normalizeCategory(req.params.label);
    const key = normalizedKey(label);

    const updated = await Category.findOneAndUpdate(
      { normalized: key },
      { $set: { status: 'rejected', label } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Kategori bulunamadı.' });

    return res.json({ ok: true, label: updated.label, status: updated.status });
  } catch (err) {
    console.error('categories reject error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

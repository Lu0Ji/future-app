const express = require('express');
const router = express.Router();
const categories = require('../config/categories');
const Prediction = require('../models/Prediction');



// GET /api/categories  -> sabit kategoriler + kullanıcının ürettiği kategoriler
router.get('/', async (req, res) => {
  try {
    const base = categories || [];
    const baseKeys = new Set(base.map((c) => c.key));

    // DB'de kullanılan farklı kategoriler (custom)
    const distinct = await Prediction.distinct('category', {
      category: { $nin: ['', null] },
    });

    const custom = (distinct || [])
      .map((x) => String(x || '').trim())
      .filter((x) => x && x.length <= 50)
      .filter((x) => !baseKeys.has(x)) // sabit key ile aynıysa tekrar etme
      .sort((a, b) => a.localeCompare(b, 'tr'));

    const merged = [
      ...base,
      ...custom.map((c) => ({ key: c, label: c })),
    ];

    return res.json({ count: merged.length, data: merged });
  } catch (err) {
    console.error('categories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

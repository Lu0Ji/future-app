const express = require('express');
const router = express.Router();
const categories = require('../config/categories');

// GET /api/categories
router.get('/', (req, res) => {
  res.json({
    count: categories.length,
    data: categories,
  });
});

module.exports = router;

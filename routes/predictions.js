const express = require('express');
const router = express.Router();

// Server çalıştığı sürece hafızada kalacak tahmin listesi
const predictions = [];

// POST /api/predictions  -> tahmin oluşturma
router.post('/', (req, res) => {
  const { content, targetDate } = req.body;

  if (!content || !targetDate) {
    return res.status(400).json({ error: 'Prediction and targetDate are required.' });
  }

  const newPrediction = {
    id: predictions.length + 1,
    content,
    targetDate, // "2026-12-31" gibi string
    createdAt: new Date().toISOString(),
  };

  predictions.push(newPrediction);

  return res.status(201).json({
    message: 'Prediction created',
    data: newPrediction,
  });
});

// GET /api/predictions  -> sadece zamanı gelen tahminler
router.get('/', (req, res) => {
  const now = new Date();

  const visiblePredictions = predictions.filter((prediction) => {
    const target = new Date(prediction.targetDate);
    return target <= now; // hedef tarih bugün veya geçmişse görünür
  });

  return res.json({
    count: visiblePredictions.length,
    data: visiblePredictions,
  });
});

module.exports = router;

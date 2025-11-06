const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Server çalıştığı sürece hafızada kalacak tahmin listesi
const predictions = [];

// Yardımcı: bugün (saatleri sıfırlanmış)
function getTodayWithoutTime() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// POST /api/predictions  -> tahmin oluşturma (sadece login kullanıcı)
router.post('/', auth, (req, res) => {
  const { content, targetDate } = req.body;

  if (!content || !targetDate) {
    return res
      .status(400)
      .json({ error: 'Prediction and targetDate are required.' });
  }

  const target = new Date(targetDate);
  if (isNaN(target.getTime())) {
    return res.status(400).json({ error: 'Invalid target date.' });
  }

  const today = getTodayWithoutTime();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  // Geçmiş tarihe tahmin yasak
  if (targetDay < today) {
    return res
      .status(400)
      .json({ error: 'Target date must be today or in the future.' });
  }

  const newPrediction = {
    id: predictions.length + 1,
    userId: req.user.id,
    username: req.user.username,
    content,
    targetDate,
    createdAt: new Date().toISOString(),
  };

  // Tahmin kaydedildikten sonra değiştirilmiyor
  predictions.push(newPrediction);

  return res.status(201).json({
    message: 'Prediction created',
    data: newPrediction,
  });
});

// GET /api/predictions  -> sadece zamanı gelen tahminler (herkese açık)
router.get('/', (req, res) => {
  const today = getTodayWithoutTime();

  const visiblePredictions = predictions.filter((prediction) => {
    const target = new Date(prediction.targetDate);
    const targetDay = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    );

    return targetDay <= today;
  });

  return res.json({
    count: visiblePredictions.length,
    data: visiblePredictions,
  });
});

module.exports = router;

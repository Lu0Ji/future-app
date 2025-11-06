const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { content, targetDate } = req.body;

  if (!content || !targetDate) {
    return res.status(400).json({ error: 'Tahmin ve hedef tarih zorunludur.' });
  }

  // Şimdilik sadece geri gönderiyoruz
  return res.status(200).json({
    message: 'Tahmin alındı',
    data: { content, targetDate }
  });
});

module.exports = router;

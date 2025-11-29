const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const Comment = require('../models/Comment');
const categoriesConfig = require('../config/categories');


const allowedCategoryKeys = categoriesConfig.map((c) => c.key);

// Ortak helper: mühürlü mü?
function isLocked(prediction) {
  if (!prediction.targetDate) return true;
  const todayStr = new Date().toISOString().split('T')[0];
  const targetStr = prediction.targetDate.toISOString().split('T')[0];
  return targetStr > todayStr;
}

function mapPredictionForUser(prediction, currentUserId) {
  const obj = {
    id: prediction._id.toString(),
    title: prediction.title,
    content: prediction.content,
    category: prediction.category,
    targetDate: prediction.targetDate,
    status: prediction.status,
    createdAt: prediction.createdAt,
    resolvedAt: prediction.resolvedAt,
    isLocked: prediction.isLocked,
  };

  // Beğeni bilgileri
  const likedBy = prediction.likedBy || [];
  obj.likesCount =
    typeof prediction.likesCount === 'number'
      ? prediction.likesCount
      : likedBy.length;

  if (currentUserId) {
    obj.liked = likedBy.some((u) => u.toString() === currentUserId.toString());
  } else {
    obj.liked = false;
  }

  // Kullanıcı bilgisi varsa (populate ile gelen)
  if (prediction.user && prediction.user._id) {
    obj.user = {
      id: prediction.user._id.toString(),
      username: prediction.user.username,
      email: prediction.user.email,
    };
  }

  return obj;
}

// POST /api/predictions  -> tahmin oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, targetDate, category, sourceCommentId } = req.body;

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

    // Eğer bu tahmin bir yorumdan geliyorsa, önce o yorumu kontrol et
    let sourceComment = null;
    if (sourceCommentId) {
      sourceComment = await Comment.findById(sourceCommentId);
      if (!sourceComment) {
        return res.status(400).json({ error: 'Kaynak yorum bulunamadı.' });
      }

      // Sadece kendi yorumundan tahmin üretebilsin
      if (sourceComment.user.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'Sadece kendi yorumunuzdan tahmin oluşturabilirsiniz.' });
      }

      // Aynı yorumdan ikinci kez tahmin üretilmesin
      if (sourceComment.childPrediction) {
        return res
          .status(400)
          .json({ error: 'Bu yorum zaten bir tahmine dönüştürülmüş.' });
      }
    }

    // Tahmini oluştur
    const prediction = await Prediction.create({
      user: req.user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      targetDate: target,
    });

    // Yorumdan geldiyse bağı kur
    if (sourceComment) {
      sourceComment.childPrediction = prediction._id;
      await sourceComment.save();
    }

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
      likesCount: prediction.likesCount || (prediction.likedBy || []).length || 0,
      liked: prediction.likedBy
    ? prediction.likedBy.some((u) => u.toString() === req.user.id.toString())
    : false,
    });
  } catch (err) {
    console.error('Get prediction detail error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/predictions/:id/comments  -> bir tahmine ait yorumlar
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const predictionId = req.params.id;

    const prediction = await Prediction.findById(predictionId).lean();
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const comments = await Comment.find({ prediction: predictionId })
      .sort({ createdAt: 1 })
      .populate('user', '_id username email');

    const items = comments.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      createdAt: c.createdAt,
      user: c.user
        ? {
            id: c.user._id.toString(),
            username: c.user.username,
            email: c.user.email,
          }
        : null,
      childPredictionId: c.childPrediction
        ? c.childPrediction.toString()
        : null,
    }));

    return res.json({ items });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/predictions/:id/comments  -> yeni yorum ekle
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const predictionId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Yorum içeriği zorunlu.' });
    }

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const comment = await Comment.create({
      prediction: predictionId,
      user: req.user.id,
      content: content.trim(),
    });

    await comment.populate('user', '_id username email');

    return res.status(201).json({
      message: 'Comment created.',
      data: {
        id: comment._id.toString(),
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user._id.toString(),
          username: comment.user.username,
          email: comment.user.email,
        },
        childPredictionId: null,
      },
    });
  } catch (err) {
    console.error('Create comment error:', err);
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


// POST /api/predictions/:id/like  -> beğeni ekle / kaldır (toggle)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const predictionId = req.params.id;
    const userId = req.user.id;

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    // likedBy her durumda dizi olsun
    const likedBy = Array.isArray(prediction.likedBy)
      ? prediction.likedBy
      : [];

    const alreadyLiked = likedBy.some(
      (u) => u.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // Beğeniyi kaldır
      prediction.likedBy = likedBy.filter(
        (u) => u.toString() !== userId.toString()
      );
      const baseCount =
        typeof prediction.likesCount === 'number'
          ? prediction.likesCount
          : likedBy.length;
      prediction.likesCount = Math.max(0, baseCount - 1);
    } else {
      // Beğeni ekle
      likedBy.push(userId);
      prediction.likedBy = likedBy;

      const baseCount =
        typeof prediction.likesCount === 'number'
          ? prediction.likesCount
          : likedBy.length - 1; // push'tan önceki uzunluk
      prediction.likesCount = baseCount + 1;
    }

    await prediction.save({ validateBeforeSave: false });

    return res.json({
      message: alreadyLiked ? 'Unliked.' : 'Liked.',
      liked: !alreadyLiked,
      likesCount: prediction.likesCount,
    });
  } catch (err) {
    console.error('Toggle like error:', err);
    // Hata mesajını da frontend'e gönderelim ki Network tabında görebilesin
    return res
      .status(500)
      .json({ error: 'Internal server error.', detail: err.message });
  }
});



// YORUMLAR

// GET /api/predictions/:id/comments  -> bir tahmine ait yorumlar
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const predictionId = req.params.id;

    const prediction = await Prediction.findById(predictionId).lean();
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const comments = await Comment.find({ prediction: predictionId })
      .sort({ createdAt: 1 })
      .populate('user', '_id username email');

    const items = comments.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      createdAt: c.createdAt,
      user: c.user
        ? {
            id: c.user._id.toString(),
            username: c.user.username,
            email: c.user.email,
          }
        : null,
      childPredictionId: c.childPrediction
        ? c.childPrediction.toString()
        : null,
    }));

    return res.json({ items });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});




// POST /api/predictions/:id/comments -> yeni yorum ekle
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const predictionId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Yorum içeriği zorunlu.' });
    }

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    const comment = await Comment.create({
      prediction: prediction._id,
      user: req.user.id,
      content: content.trim(),
    });

    await comment.populate('user', 'username email');

    return res.status(201).json({
      id: comment._id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user
        ? {
            id: comment.user._id,
            username: comment.user.username,
            email: comment.user.email,
          }
        : null,
      childPredictionId: comment.childPrediction || null,
    });
  } catch (err) {
    console.error('Create comment error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

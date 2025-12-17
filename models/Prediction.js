const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Kısa başlık / özet
    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },


    // Tahmin metni
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Kategori (config/categories içindeki key'lerden biri)
    category: {
      type: String,
      required: true,
    },

    entryType: {
      type: String,
      enum: ['prediction', 'capsule'],
      default: 'prediction',
    },


    // Hedef tarih (tahminin açılacağı tarih)
    targetDate: {
      type: Date,
      required: true,
    },

    // Çözüm durumu
    status: {
      type: String,
      enum: ['pending', 'correct', 'incorrect'],
      default: 'pending',
    },

    // Ne zaman çözüldü (topluluk oyu veya ileride AI ile)
    resolvedAt: {
      type: Date,
      default: null,
    },

    // Beğeniler
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    // Topluluk çözüm oylamaları
    resolutionVotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        vote: {
          type: String,
          enum: ['correct', 'incorrect'],
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Çözüm yöntemi: şimdilik sadece 'crowd', ileride 'ai' vs ekleriz
    resolutionMethod: {
      type: String,
      enum: ['none', 'crowd'],
      default: 'none',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt otomatik
  }
);

module.exports = mongoose.model('Prediction', predictionSchema);

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Yeni alan: kısa başlık / özet
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    // Eski alan: tahmin metni
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'correct', 'incorrect'],
      default: 'pending',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt otomatik
  }
);

module.exports = mongoose.model('Prediction', predictionSchema);

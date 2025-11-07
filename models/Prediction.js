const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: { type: String, required: true },
  content: { type: String, required: true },
  targetDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'correct', 'incorrect'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

module.exports = mongoose.model('Prediction', predictionSchema);


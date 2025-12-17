const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    // Kullanıcıların gördüğü metin
    label: { type: String, required: true, trim: true, maxlength: 50 },

    // Dedupe için normalize edilmiş anahtar (case-insensitive)
    normalized: { type: String, required: true, unique: true, index: true },

    // pending: öneri, approved: kalıcı kategori, rejected: reddedildi
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // (İleride topluluk oylaması eklersen burası işine yarar)
    votesUp: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    votesDown: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', CategorySchema);

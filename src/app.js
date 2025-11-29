require('dotenv').config();
const express = require('express');
const path = require('path');

// ✅ MongoDB bağlantısı (dosyan config/database.js içinde)
const connectDB = require('../config/database');
connectDB();

const authRoutes = require('../routes/auth');
const predictionRoutes = require('../routes/predictions');
const categoryRoutes = require('../routes/categories');
const statsRoutes = require('../routes/stats');
const followRoutes = require('../routes/follow');
const feedRoutes = require('../routes/feed');
const userRoutes = require('../routes/users');
const messageRoutes = require('../routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON ve form verisi için middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public klasörünü statik olarak servis et (index.html, styles.css, app.js vs.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API route'ları
app.use('/api/auth', require('../routes/auth'));
app.use('/api/predictions', require('../routes/predictions'));
app.use('/api/categories', require('../routes/categories'));
app.use('/api/stats', require('../routes/stats'));
app.use('/api/follow', require('../routes/follow'));
app.use('/api/feed', require('../routes/feed'));
app.use('/api/messages', require('../routes/messages'));
app.use('/api/users', require('../routes/users'));
app.use('/api/leaderboard', require('../routes/leaderboard'));


// Basit health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// /api ile başlayan ama yukarıda yakalanmayan her şey için 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

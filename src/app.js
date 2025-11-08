require('dotenv').config(); // .env yükle

const express = require('express');
const connectDB = require('../config/database');
const categoryRoutes = require('../routes/categories');
const statsRoutes = require('../routes/stats');
const followRoutes = require('../routes/follow');
const feedRoutes = require('../routes/feed');
const userRoutes = require('../routes/users');




const authRoutes = require('../routes/auth');
const predictionRoutes = require('../routes/predictions');

const app = express();
const port = 3000;

// MongoDB bağlantısı
connectDB();

// JSON body okumak için
app.use(express.json());

// public klasöründeki statik dosyaları sun
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);





app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

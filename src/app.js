const express = require('express');
const app = express();
const port = 3000;
const authRoutes = require('../routes/auth');

// JSON gövdesini okuyabilmek için
app.use(express.json());

app.use('/api/auth', authRoutes);

// public klasöründeki statik dosyaları sun
app.use(express.static('public'));

// Routes
const predictionRoutes = require('../routes/predictions');
app.use('/api/predictions', predictionRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

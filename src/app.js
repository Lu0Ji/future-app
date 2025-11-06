const express = require('express');
const app = express();
const port = 3000;

// JSON gövdesini okuyabilmek için
app.use(express.json());

// public klasöründeki statik dosyaları sun
app.use(express.static('public'));

// Routes
const predictionRoutes = require('../routes/predictions');
app.use('/api/predictions', predictionRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

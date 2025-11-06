const express = require('express');
const app = express();
const port = 3000;

// Body verisini JSON olarak alabilmek için
app.use(express.json());

// Routes
const predictionRoutes = require('../routes/predictions');
app.use('/api/predictions', predictionRoutes);

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

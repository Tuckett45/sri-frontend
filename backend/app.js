const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend access (adjust allowed origins)
app.use(cors({
  origin: ['http://localhost:4200', 'https://www.ark-sri.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Route for geocode search
app.get('/proxy/geocode', async (req, res) => {
  const { query } = req.query;
  const geocodeUrl = `https://nominatim.openstreetmap.org/search?addressdetails=1&format=jsonv2&q=${query}&countrycodes=US&layer=address&limit=5`;

  try {
    const response = await axios.get(geocodeUrl);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data from geocoding API' });
  }
});

// Route for reverse geocode
app.get('/proxy/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;
  const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  try {
    const response = await axios.get(reverseGeocodeUrl);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data from reverse geocoding API' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});

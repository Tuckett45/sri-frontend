const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

// Middleware to handle CORS
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:4200', 'https://ark-sri.com']; // Add any other origins here as needed
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin); // Allow the origin dynamically
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Proxy Route for Geocode Address
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

// Proxy Route for Reverse Geocode
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

app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});

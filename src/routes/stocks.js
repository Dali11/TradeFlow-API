const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');

// GET /api/v1/stocks
router.get('/', (req, res) => {
  let stocks = cache.get('stocks') || [];
  const { ticker, sector, sort, order } = req.query;

  if (ticker) {
    stocks = stocks.filter(s => s.ticker === ticker.toUpperCase());
  }

  if (sector) {
    stocks = stocks.filter(s => s.sector.toLowerCase() === sector.toLowerCase());
  }

  if (sort) {
    stocks.sort((a, b) => {
      const valA = a[sort];
      const valB = b[sort];
      if (order === 'desc') {
        return valA < valB ? 1 : -1;
      }
      return valA > valB ? 1 : -1;
    });
  }

  res.json({
    success: true,
    count: stocks.length,
    lastUpdated: cache.get('lastUpdated'),
    data: stocks
  });
});

// GET /api/v1/stocks/:ticker
router.get('/:ticker', (req, res) => {
  const stocks = cache.get('stocks') || [];
  const stock = stocks.find(s => s.ticker === req.params.ticker.toUpperCase());

  if (!stock) {
    return res.status(404).json({
      success: false,
      error: 'Stock not found'
    });
  }

  res.json({
    success: true,
    lastUpdated: cache.get('lastUpdated'),
    data: stock
  });
});

module.exports = router;

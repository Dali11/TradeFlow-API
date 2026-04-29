const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const historicalScraper = require('../scrapers/historicalScraper');

// GET /api/v1/indices
router.get('/', (req, res) => {
  const indices = cache.get('indices') || [];
  res.json({
    success: true,
    count: indices.length,
    lastUpdated: cache.get('lastUpdated'),
    data: indices
  });
});

// GET /api/v1/indices/masi/history
router.get('/masi/history', async (req, res, next) => {
  try {
    let history = cache.get('masi_history');
    if (!history) {
      history = await historicalScraper.scrapeMasiHistory();
      cache.set('masi_history', history, 3600); // 1h TTL
    }

    const { limit, from, to } = req.query;
    let filtered = [...history];

    if (from) filtered = filtered.filter(h => h.date >= from);
    if (to) filtered = filtered.filter(h => h.date <= to);
    if (limit) filtered = filtered.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: filtered.length,
      lastUpdated: new Date().toISOString(),
      data: filtered
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

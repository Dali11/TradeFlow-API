const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const historicalScraper = require('../scrapers/historicalScraper');

// GET /api/v1/historical/:ticker
router.get('/:ticker', async (req, res, next) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const cacheKey = `history_${ticker}`;
    
    let history = cache.get(cacheKey);
    if (!history) {
      history = await historicalScraper.scrapeTicker(ticker);
      if (history && history.length > 0) {
        cache.set(cacheKey, history, 3600); // 1h TTL
      }
    }

    if (!history || history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Historical data not found for this ticker'
      });
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

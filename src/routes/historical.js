const express = require("express");
const router = express.Router();
const { scrapeHistoricalPrices } = require("../scrapers/historicalScraper");

router.get("/:ticker", async (req, res, next) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    let history = await scrapeHistoricalPrices(ticker);

    if (!history || history.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No historical data found for '${ticker}'.`
      });
    }

    const { limit = 90, from, to } = req.query;
    if (from) history = history.filter(h => h.date >= from);
    if (to) history = history.filter(h => h.date <= to);
    history = history.slice(0, parseInt(limit));

    res.json({
      success: true,
      ticker,
      count: history.length,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

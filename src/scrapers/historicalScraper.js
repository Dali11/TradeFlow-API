/**
 * Historical price data — two sources combined:
 * 1. Accumulated real prices from live scrapes (grows over time)
 * 2. Seeded realistic history based on current price (fills gaps)
 */

const cache = require("../utils/cache");

// Known current prices as of April 2026 — used as seed baseline
const SEED_PRICES = {
  AIRTEL:   112.56,
  BHL:       15.07,
  FDHB:     584.41,
  FMBCH:   1829.99,
  ICON:      15.99,
  ILLOVO:  2948.65,
  MPICO:     19.50,
  NBM:    10999.68,
  NBS:      771.38,
  NICO:    1648.58,
  NITL:    3930.88,
  OMU:     5300.00,
  PCL:     7820.80,
  STANDARD:4169.95,
  SUNBIRD: 2248.06,
  TNM:       29.99,
};

// Volatility per stock (daily % move std dev)
const VOLATILITY = {
  AIRTEL: 0.008, BHL: 0.012, FDHB: 0.006, FMBCH: 0.005,
  ICON: 0.010, ILLOVO: 0.007, MPICO: 0.009, NBM: 0.006,
  NBS: 0.015, NICO: 0.007, NITL: 0.005, OMU: 0.004,
  PCL: 0.005, STANDARD: 0.009, SUNBIRD: 0.008, TNM: 0.010,
};

/**
 * Generate seeded historical prices working BACKWARDS from current price.
 * Uses a seeded random walk so results are deterministic (same every call).
 */
function generateSeedHistory(ticker, currentPrice, days = 365) {
  const vol = VOLATILITY[ticker] || 0.008;
  const history = [];
  let price = currentPrice;
  const now = new Date();

  // Simple deterministic seed based on ticker
  let seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i <= days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    if (i > 0) {
      // Random walk backwards
      const change = (seededRandom() - 0.502) * 2 * vol;
      price = Math.max(price * (1 - change), price * 0.3);
    }

    const close = parseFloat(price.toFixed(2));
    const prevClose = parseFloat((price * (1 + (seededRandom() - 0.5) * vol * 0.5)).toFixed(2));
    history.push({
      date: date.toISOString().split("T")[0],
      close,
      change: parseFloat((close - prevClose).toFixed(2)),
      volume: Math.floor(seededRandom() * 50000 + 1000),
      source: "seeded",
    });
  }

  return history; // already newest-first (i=0 is today)
}

/**
 * Record a real price observation from a live scrape.
 * Called by mseScraper after each successful scrape.
 */
function recordLivePrice(ticker, price, volume, change) {
  if (!ticker || !price) return;
  const key = `history_live_${ticker.toUpperCase()}`;
  const existing = cache.get(key) || [];
  const today = new Date().toISOString().split("T")[0];

  // Don't duplicate same-day entries
  if (existing.length > 0 && existing[0].date === today) {
    existing[0] = { date: today, close: price, change, volume, source: "live" };
  } else {
    existing.unshift({ date: today, close: price, change, volume, source: "live" });
  }

  // Keep max 500 real observations
  const trimmed = existing.slice(0, 500);
  cache.set(key, trimmed, 86400 * 30); // 30 day TTL
}

/**
 * Get historical prices for a ticker.
 * Merges real accumulated data with seeded history to fill gaps.
 */
async function scrapeHistoricalPrices(ticker, limit = 365) {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = `historical_merged_${upperTicker}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Get any real accumulated prices
  const liveKey = `history_live_${upperTicker}`;
  const liveData = cache.get(liveKey) || [];

  // Get seed baseline price — prefer live current price if available
  const stocks = cache.get("stocks") || [];
  const liveStock = stocks.find(s => s.ticker === upperTicker);
  const basePrice = liveStock?.price || SEED_PRICES[upperTicker];

  if (!basePrice) {
    return [];
  }

  // Generate seeded history
  const seeded = generateSeedHistory(upperTicker, basePrice, limit);

  // Merge: live data overrides seeded for same dates
  const liveByDate = {};
  liveData.forEach(d => { liveByDate[d.date] = d; });

  const merged = seeded.map(d => liveByDate[d.date] || d);

  // Add any live dates not in seeded range
  liveData.forEach(d => {
    if (!merged.find(m => m.date === d.date)) {
      merged.unshift(d);
    }
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  const result = merged.slice(0, limit);

  cache.set(cacheKey, result, 1800);
  return result;
}

module.exports = { scrapeHistoricalPrices, recordLivePrice };

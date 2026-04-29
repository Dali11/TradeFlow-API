const cheerio = require("cheerio");
const httpClient = require("../utils/httpClient");
const cache = require("../utils/cache");

/**
 * Normalizes date string to YYYY-MM-DD
 * @param {string} dateStr
 * @returns {string}
 */
function normalizeDate(dateStr) {
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  return dateStr;
}

/**
 * Scrapes historical data from afx.kwayisi.org
 * @param {string} ticker
 * @returns {Promise<Array>}
 */
async function scrapeHistoricalPrices(ticker) {
  const cacheKey = `historical_${ticker.toUpperCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://afx.kwayisi.org/mse/${ticker.toLowerCase()}.html`;
  console.log(`[SCRAPER] Fetching historical for ${ticker} from ${url}`);

  try {
    const response = await httpClient.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const history = [];

    // Try all table rows — afx uses a plain HTML table
    $("table tr").each((i, row) => {
      if (i === 0) return; // skip header row
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const dateStr = $(cells[0]).text().trim();
      const priceStr = $(cells[1]).text().replace(/[^0-9.]/g, "");
      const close = parseFloat(priceStr);

      // Parse optional change and volume columns
      const changeStr = $(cells[2])?.text?.().trim() || "0";
      const change = parseFloat(changeStr.replace(/[^0-9.-]/g, "")) || 0;
      const volumeStr = $(cells[3])?.text?.().replace(/,/g, "") || "0";
      const volume = parseInt(volumeStr) || 0;

      if (dateStr && !isNaN(close) && close > 0) {
        history.push({
          date: normalizeDate(dateStr),
          close,
          change,
          volume,
        });
      }
    });

    if (history.length > 0) {
      // Sort newest first
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      cache.set(cacheKey, history, 3600);
      console.log(`[SCRAPER] Got ${history.length} historical records for ${ticker}`);
      return history;
    }

    console.warn(`[SCRAPER] No rows parsed for ${ticker} — HTML length: ${html ? html.length : 0}`);
    return [];
  } catch (err) {
    console.error(`[SCRAPER] Historical fetch failed for ${ticker}:`, err.message);
    return [];
  }
}

module.exports = { scrapeHistoricalPrices };

const { 
  scrapeStockPrices, 
  scrapeIndices, 
  scrapeCompanies 
} = require('./mseScraper');
const cache = require('../utils/cache');

/**
 * Orchestrates all scrapers with AFX strategy
 */
async function runAllScrapers() {
  console.log("[SCRAPER] Starting full data refresh...");
  
  const results = await Promise.allSettled([
    scrapeStockPrices(),
    scrapeIndices(),
    scrapeCompanies(),
  ]);

  const names = ["stocks", "indices", "companies"];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error("[SCRAPER]", names[i], "failed:", r.reason?.message);
    } else {
      console.log("[SCRAPER]", names[i], "OK —", r.value?.length ?? 0, "records");
    }
  });

  // Update metadata
  cache.set('lastUpdated', new Date().toISOString());
  console.log('Scrape completed');
}

module.exports = { runAllScrapers };

// DISABLED — mse.co.mw uses WAF+reCAPTCHA. Switched to AFX scraper.

module.exports = {
  launchBrowser: async () => { throw new Error("Puppeteer is disabled"); },
  fetchWithBrowser: async () => { throw new Error("Puppeteer is disabled"); },
  scrapeStockPricesBrowser: async () => [],
  scrapeIndicesBrowser: async () => [],
  scrapeCompaniesBrowser: async () => []
};

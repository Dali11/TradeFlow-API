const cheerio = require('cheerio');
const httpClient = require('../utils/httpClient');
const cache = require('../utils/cache');

const BASE_URL = 'https://afx.kwayisi.org/mse';

const SEED_TICKERS = [
  'AIRTEL', 'BHL', 'FDHB', 'FMBCH', 'ICON', 'ILLOVO', 'MPICO', 'NBM', 'NBS', 'NICO', 'NITL', 'OMU', 'PCL', 'STANDARD', 'SUNBIRD', 'TNM'
];

const LISTED_SHARES = {
  'AIRTEL': 15560000000,
  'BHL': 259001832,
  'FDHB': 5894528641,
  'FMBCH': 1228001088,
  'ICON': 3225000000,
  'ILLOVO': 424743200,
  'MPICO': 3049336042,
  'NBM': 261954827,
  'NBS': 1726395050,
  'NICO': 952946682,
  'NITL': 342000000,
  'OMU': 10634049555,
  'PCL': 312394380,
  'STANDARD': 429266000,
  'SUNBIRD': 441346382,
  'TNM': 7418600000
};

/**
 * Scrapes MSE live prices and indices from afx.kwayisi.org
 */
const mseScraper = {
  async scrapeStockPrices() {
    return await mseScraper._scrapeStockPricesInternal();
  },

  async _scrapeStockPricesInternal() {
    try {
      const response = await httpClient.get(BASE_URL);
      const $ = cheerio.load(response.data);
      const stocks = [];

      // The main stocks table is likely inside a div with class 't'
      $('.t table tbody tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 5) {
          const ticker = $(cols[0]).text().trim().toUpperCase();
          const name = $(cols[1]).text().trim();
          const volumeText = $(cols[2]).text().replace(/,/g, '').trim();
          const volume = volumeText ? parseInt(volumeText) : 0;
          const price = parseFloat($(cols[3]).text().replace(/,/g, '')) || 0;
          const changeText = $(cols[4]).text().trim();
          const change = parseFloat(changeText.replace(/,/g, '')) || 0;

          // previousClose calculation
          const previousClose = parseFloat((price - change).toFixed(2));
          
          // Fix 2: changePercent precision
          // AFX provides change as absolute value. We calculate percentage from change and previousClose.
          // In previous version it was: (change / previousClose) * 100
          // If the source was providing it directly, we would round it. 
          // Based on issue description "The current output shows values like -0.03, 0.2, -0.8, -0.7"
          // These are already in percentage points (0.2 means 0.2%).
          const changePercent = previousClose !== 0 ? parseFloat(((change / previousClose) * 100).toFixed(2)) : 0;

          // Fix 1: Value calculation fallback
          let value = 0; // Source doesn't seem to provide 'value' in the same table row, but if it did we'd use it.
          if (value === 0 || value === null) {
            value = parseFloat((price * volume).toFixed(2));
          }

          // Fix 3: MarketCap calculation
          const listedShares = LISTED_SHARES[ticker] || null;
          const marketCap = listedShares ? Math.round(price * listedShares) : null;

          stocks.push({
            ticker,
            name,
            currency: "MWK",
            price,
            previousClose,
            change,
            changePercent,
            volume,
            value,
            marketCap,
            timestamp: new Date().toISOString()
          });
        }
      });

      console.log(`[SCRAPER] Found ${stocks.length} stocks on AFX`);
      if (stocks.length > 0) {
        cache.set('stocks', stocks, 1800);
      }
      return stocks;
    } catch (error) {
      console.error('AFX Stock Scraper Error:', error.message);
      const fallback = mseScraper.getSeedStocks();
      cache.set('stocks', fallback, 1800);
      return fallback;
    }
  },

  async scrapeIndices() {
    try {
      const response = await httpClient.get(BASE_URL);
      const $ = cheerio.load(response.data);
      const indices = [];

      // MASI index is usually in the first table or a header div
      $('table').each((i, table) => {
        const headerText = $(table).find('th').first().text().toUpperCase();
        if (headerText.includes('MASI INDEX')) {
          const row = $(table).find('tbody tr').first();
          const cols = row.find('td');
          if (cols.length >= 1) {
            const masiText = $(cols[0]).text().trim();
            const match = masiText.match(/([\d,.]+)\s*\(([-+ \d,.]+)\)/);
            if (match) {
              const value = parseFloat(match[1].replace(/,/g, ''));
              const change = parseFloat(match[2].replace(/,/g, ''));
              const previousValue = value - change;
              const changePercent = previousValue !== 0 ? parseFloat(((change / previousValue) * 100).toFixed(2)) : 0;

              indices.push({
                name: 'MASI',
                value,
                change,
                changePercent,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });

      console.log(`[SCRAPER] Found ${indices.length} indices on AFX`);
      if (indices.length > 0) {
        cache.set('indices', indices, 1800);
      }
      return indices;
    } catch (error) {
      console.error('AFX Indices Scraper Error:', error.message);
      return [];
    }
  },

  async scrapeCompanies() {
    try {
      const stocks = await mseScraper._scrapeStockPricesInternal();
      const companies = stocks.map(s => ({
        ticker: s.ticker,
        name: s.name,
        sector: "Unknown",
        exchange: "MSE",
        listedDate: null
      }));

      console.log(`[SCRAPER] Derived ${companies.length} companies`);
      if (companies.length > 0) {
        cache.set('companies', companies, 86400);
      }
      return companies;
    } catch (error) {
      console.error('AFX Company Scraper Error:', error.message);
      return mseScraper.getSeedCompanies();
    }
  },

  async scrapeHistoricalPrices(ticker) {
    const url = `https://afx.kwayisi.org/mse/stock/${ticker.toLowerCase()}/`;
    try {
      const response = await httpClient.get(url);
      const $ = cheerio.load(response.data);
      const history = [];

      $('table tbody tr').each((i, el) => {
        const cols = $(el).find('td');
        if (cols.length >= 5) {
          history.push({
            date: $(cols[0]).text().trim(),
            price: parseFloat($(cols[2]).text().replace(/,/g, '')) || 0,
            volume: parseInt($(cols[3]).text().replace(/,/g, '')) || 0,
            change: parseFloat($(cols[4]).text().replace(/,/g, '')) || 0
          });
        }
      });
      return history;
    } catch (error) {
      console.error(`Historical Scraper Error (${ticker}):`, error.message);
      return [];
    }
  },

  getSeedStocks() {
    return SEED_TICKERS.map(ticker => ({
      ticker,
      name: ticker,
      sector: 'Unknown',
      currency: 'MWK',
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      volume: null,
      value: null,
      marketCap: null,
      timestamp: new Date().toISOString()
    }));
  },

  getSeedCompanies() {
    return SEED_TICKERS.map(ticker => ({
      ticker,
      name: ticker,
      sector: 'Unknown'
    }));
  }
};

module.exports = mseScraper;

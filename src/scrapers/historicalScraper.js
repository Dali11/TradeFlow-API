const cheerio = require('cheerio');
const httpClient = require('../utils/httpClient');

const HISTORICAL_BASE_URL = 'https://afx.kwayisi.org/mse';

/**
 * Scrapes historical data from afx.kwayisi.org/mse
 */
const historicalScraper = {
  async scrapeTicker(ticker) {
    try {
      const url = `${HISTORICAL_BASE_URL}/${ticker.toLowerCase()}.html`;
      const response = await httpClient.get(url);
      const $ = cheerio.load(response.data);
      const history = [];

      $('table tr').each((i, el) => {
        if (i === 0) return;
        const cols = $(el).find('td');
        if (cols.length >= 6) {
          const date = $(cols[0]).text().trim(); // Format might be YYYY-MM-DD or similar
          history.push({
            date: this.normalizeDate(date),
            close: parseFloat($(cols[4]).text().replace(/,/g, '')),
            volume: parseInt($(cols[5]).text().replace(/,/g, ''))
          });
        }
      });

      return history;
    } catch (error) {
      console.error(`Historical Scraper Error for ${ticker}:`, error.message);
      return [];
    }
  },

  async scrapeMasiHistory() {
    try {
      // AFX might have index history on the main MSE page or a specific index page
      const response = await httpClient.get(HISTORICAL_BASE_URL);
      const $ = cheerio.load(response.data);
      const history = [];

      // Look for MASI history table if available
      // This is a placeholder as exact structure may vary
      $('table.index-history tr').each((i, el) => {
         if (i === 0) return;
         const cols = $(el).find('td');
         if (cols.length >= 2) {
           history.push({
             date: this.normalizeDate($(cols[0]).text().trim()),
             value: parseFloat($(cols[1]).text().replace(/,/g, ''))
           });
         }
      });
      return history;
    } catch (error) {
      console.error('MASI History Scraper Error:', error.message);
      return [];
    }
  },

  normalizeDate(dateStr) {
    // Attempt to normalize to YYYY-MM-DD
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return dateStr;
  }
};

module.exports = historicalScraper;

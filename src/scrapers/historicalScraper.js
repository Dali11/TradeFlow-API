const cheerio = require("cheerio");
const httpClient = require("../utils/httpClient");

/**
 * Scrapes historical data from afx.kwayisi.org
 * @param {string} ticker
 * @returns {Promise<Array>}
 */
async function scrapeHistoricalPrices(ticker) {
  try {
    const url = `https://afx.kwayisi.org/mse/stock/${ticker.toLowerCase()}/`;
    const response = await httpClient.get(url);
    const $ = cheerio.load(response.data);
    const history = [];

    $("table tr").each((i, el) => {
      if (i === 0) return;
      const cols = $(el).find("td");
      if (cols.length >= 6) {
        const date = $(cols[0]).text().trim();
        history.push({
          date: date,
          close: parseFloat($(cols[4]).text().replace(/,/g, "")),
          volume: parseInt($(cols[5]).text().replace(/,/g, ""))
        });
      }
    });

    return history;
  } catch (error) {
    console.error(`Historical Scraper Error for ${ticker}:`, error.message);
    return [];
  }
}

module.exports = { scrapeHistoricalPrices };

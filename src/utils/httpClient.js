const axios = require('axios');

const TIMEOUT = process.env.NODE_ENV === 'production' ? 30000 : 15000;
const MAX_RETRIES = process.env.NODE_ENV === 'production' ? 5 : 3;
const DELAY = process.env.NODE_ENV === 'production' ? 500 : 1500;

/**
 * Axios wrapper with retries and delays
 */
const httpClient = {
  async get(url, options = {}, retries = MAX_RETRIES, delay = DELAY) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options.headers
    };

    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url, { ...options, headers, timeout: TIMEOUT });
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait for polite delay
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 500));
      }
    }
  }
};

module.exports = httpClient;

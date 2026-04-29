const axios = require('axios');

/**
 * Axios wrapper with retries and delays
 */
const httpClient = {
  async get(url, options = {}, retries = 3, delay = 1500) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options.headers
    };

    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url, { ...options, headers });
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait for polite delay
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 500));
      }
    }
  }
};

module.exports = httpClient;

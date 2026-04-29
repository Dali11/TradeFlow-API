require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');
const { runAllScrapers } = require('./scrapers');
const cache = require('./utils/cache');
const limiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes
const stockRoutes = require('./routes/stocks');
const indexRoutes = require('./routes/indices');
const companyRoutes = require('./routes/companies');
const historicalRoutes = require('./routes/historical');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    "name": "TradeFlow",
    "description": "Malawi Stock Exchange market data API",
    "version": "1.0.0",
    "status": "ok",
    "port": PORT,
    "environment": process.env.NODE_ENV || "production",
    "lastUpdated": (typeof cache.getLastUpdated === 'function' ? cache.getLastUpdated() : null),
    "uptime": Math.floor(process.uptime()) + "s",
    "endpoints": {
      "stocks": "/api/v1/stocks",
      "indices": "/api/v1/indices",
      "companies": "/api/v1/companies",
      "historical": "/api/v1/historical/:ticker"
    }
  });
});

// API Routes
app.get("/api/v1/status", async (req, res) => {
  res.json({
    stocks: { count: (cache.get("stocks") || []).length, hasData: (cache.get("stocks") || []).length > 0 },
    indices: { count: (cache.get("indices") || []).length, hasData: (cache.get("indices") || []).length > 0 },
    companies: { count: (cache.get("companies") || []).length, hasData: (cache.get("companies") || []).length > 0 },
    lastUpdated: (typeof cache.getLastUpdated === 'function' ? cache.getLastUpdated() : null),
    uptime: Math.floor(process.uptime()) + "s",
    environment: process.env.NODE_ENV || "development"
  });
});

app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/indices', indexRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/historical', historicalRoutes);

app.get("/debug/historical", async (req, res) => {
  try {
    const httpClient = require("./utils/httpClient");
    const cheerio = require("cheerio");
    const url = "https://afx.kwayisi.org/mse/nbm.html";
    const response = await httpClient.get(url, { timeout: 45000 });
    const html = response.data;
    const $ = cheerio.load(html);

    const debug = {
      url,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 3000),
      tablesFound: $("table").length,
      totalRows: $("tr").length,
      tables: []
    };

    $("table").each((i, table) => {
      const headers = $(table).find("th").map((_, th) => $(th).text().trim()).get();
      const firstRow = $(table).find("tr").eq(1).find("td").map((_, td) => $(td).text().trim()).get();
      const rowCount = $(table).find("tr").length;
      debug.tables.push({ index: i, headers, firstRow, rowCount });
    });

    res.json(debug);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Error Handling
app.use(errorHandler);

// Cron Scheduler: Every 30 minutes, Mon-Fri 09:00-15:00 CAT
// Africa/Blantyre is UTC+2.
// 09:00-15:00 CAT is 07:00-13:00 UTC.
const interval = process.env.SCRAPE_INTERVAL_MINUTES || 30;
cron.schedule(`*/${interval} 7-13 * * 1-5`, async () => {
  console.log('Running scheduled scrape...');
  await runAllScrapers();
}, {
  timezone: "UTC"
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`TradeFlow API running on port ${PORT}`);
  
  // Initial scrape on startup
  console.log('Running initial scrape...');
  await runAllScrapers();
});

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
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/indices', indexRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/historical', historicalRoutes);

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

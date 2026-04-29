# TradeFlow
Unofficial REST API for Malawi Stock Exchange market data

A production-ready Node.js REST API that scrapes live and historical market data from the Malawi Stock Exchange (MSE).

## Features
- **Live Scaping**: Real-time stock prices and indices from mse.co.mw.
- **Historical Data**: Deep price history for all tickers from afx.kwayisi.org.
- **Auto-Refresh**: Cron-based updates every 30 minutes on trading days.
- **Robustness**: 3-retry mechanism with polite delays and fallback to seed data.
- **Performance**: In-memory TTL caching and rate limiting.

## Tech Stack
- Runtime: Node.js 20+
- Framework: Express.js
- Scraping: Axios + Cheerio
- Scheduling: node-cron
- Security: Helmet, CORS, Express-Rate-Limit

## Quick Start
1. Clone the repository: `git clone https://github.com/user/tradeflow.git`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`.
4. Run in development: `npm run dev`
5. Start in production: `npm start`

## API Reference

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/` | GET | Health check & system status | - |
| `/api/v1/stocks` | GET | All live prices | `ticker`, `sector`, `sort`, `order` |
| `/api/v1/stocks/:ticker` | GET | Single stock by ticker | - |
| `/api/v1/indices` | GET | MASI, MDSI, MFSI indices | - |
| `/api/v1/indices/masi/history` | GET | Historical MASI values | `limit`, `from`, `to` |
| `/api/v1/companies` | GET | All listed companies | `sector`, `search` |
| `/api/v1/companies/:ticker` | GET | Single company profile | - |
| `/api/v1/historical/:ticker` | GET | Per-stock price history | `limit`, `from`, `to` |

## Architecture Overview
The API uses a layered architecture:
- **Scrapers**: Logic to fetch and parse data from MSE and AFX.
- **Utils**: Reusable HTTP client and Cache management.
- **Middleware**: Security, rate limiting, and error handling.
- **Routes**: Clean JSON endpoints for data consumption.

Data is stored in-memory with a TTL cache to minimize load on source websites. A cron job ensures data is refreshed during trading hours (Mon-Fri 09:00-15:00 CAT).

## Deployment

### Railway (recommended)

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub repo
3. Select the tradeflow repository
4. Add environment variable: NODE_ENV = production
5. Railway auto-detects Node.js and runs npm start
6. Live at: https://tradeflow.up.railway.app (or your assigned domain)

### Environment variables
Set in Railway dashboard under Variables:
- NODE_ENV = production
- SCRAPE_INTERVAL_MINUTES = 30 (optional, default is 30)

No CHROME_PATH required — Puppeteer is disabled, API uses Axios scraping from afx.kwayisi.org/mse.

const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');

// GET /api/v1/companies
router.get('/', (req, res) => {
  let companies = cache.get('companies') || [];
  const { sector, search } = req.query;

  if (sector) {
    companies = companies.filter(c => c.sector.toLowerCase() === sector.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    companies = companies.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.ticker.toLowerCase().includes(term)
    );
  }

  res.json({
    success: true,
    count: companies.length,
    lastUpdated: cache.get('lastUpdated'),
    data: companies
  });
});

// GET /api/v1/companies/:ticker
router.get('/:ticker', (req, res) => {
  const companies = cache.get('companies') || [];
  const company = companies.find(c => c.ticker === req.params.ticker.toUpperCase());

  if (!company) {
    return res.status(404).json({
      success: false,
      error: 'Company not found'
    });
  }

  res.json({
    success: true,
    lastUpdated: cache.get('lastUpdated'),
    data: company
  });
});

module.exports = router;

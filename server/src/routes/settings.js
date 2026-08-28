const { Router } = require('express');
const { getDb } = require('../db');
const { requireRole } = require('../auth');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = isNaN(row.value) ? row.value : Number(row.value);
  }
  res.json(settings);
});

router.put('/', requireRole('admin'), (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

  for (const [key, value] of Object.entries(req.body)) {
    upsert.run(key, String(value));
  }

  // Return updated settings
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = isNaN(row.value) ? row.value : Number(row.value);
  }
  res.json(settings);
});

module.exports = router;

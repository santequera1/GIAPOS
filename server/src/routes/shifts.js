const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// Calculate live stats for an open shift
function getShiftLiveStats(db, shift) {
  const filter = shift && shift.id ? 'AND shift_id = ' + shift.id : "AND date(created_at) = date('now', '-5 hours')";

  // Sales totals by payment method
  const salesByPayment = db.prepare(`
    SELECT
      payment_method,
      COALESCE(SUM(total), 0) as total,
      COUNT(*) as count
    FROM orders
    WHERE status != 'cancelled' ${filter}
    GROUP BY payment_method
  `).all();

  let cashSales = 0;
  let debitSales = 0;
  let creditSales = 0;
  let transferSales = 0;
  let totalOrders = 0;
  let totalSales = 0;

  for (const row of salesByPayment) {
    totalOrders += row.count;
    totalSales += row.total;
    if (row.payment_method === 'cash') cashSales += row.total;
    else if (row.payment_method === 'card_debit') debitSales += row.total;
    else if (row.payment_method === 'card_credit' || row.payment_method === 'card') creditSales += row.total;
    else if (row.payment_method === 'transfer') transferSales += row.total;
  }

  // Flavors / products breakdown
  const flavorStats = db.prepare(`
    SELECT
      oi.name,
      oi.size,
      oi.flavors,
      SUM(oi.quantity) as qty,
      SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelled' ${filter}
    GROUP BY oi.name, oi.size, oi.flavors
    ORDER BY qty DESC
  `).all();

  const initialCash = (shift && shift.initial_cash) || 0;
  const expectedCash = initialCash + cashSales;

  return {
    ...shift,
    initialCash,
    cashSales,
    debitSales,
    creditSales,
    transferSales,
    totalSales,
    totalOrders,
    expectedCash,
    flavorStats,
  };
}

// Get current open shift or today's active shift
router.get('/current', (req, res) => {
  const db = getDb();
  let shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1").get();

  if (!shift) {
    // If no shift is open, create one automatically for convenience in convention
    const result = db.prepare(`
      INSERT INTO cash_shifts (user_id, cashier_name, opened_at, initial_cash, status, notes)
      VALUES (?, ?, datetime('now', '-5 hours'), 100000, 'open', 'Turno Convención')
    `).run(req.user?.id || 1, req.user?.name || 'Cajero');
    shift = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(result.lastInsertRowid);
  }

  const live = getShiftLiveStats(db, shift);
  res.json(live);
});

// Open a new shift
router.post('/open', (req, res) => {
  const { initialCash = 0, cashierName, notes = '' } = req.body;
  const db = getDb();

  // Close any previously open shift first
  db.prepare("UPDATE cash_shifts SET status = 'closed', closed_at = datetime('now', '-5 hours') WHERE status = 'open'").run();

  const name = cashierName || req.user?.name || 'Caja';
  const result = db.prepare(`
    INSERT INTO cash_shifts (user_id, cashier_name, opened_at, initial_cash, status, notes)
    VALUES (?, ?, datetime('now', '-5 hours'), ?, 'open', ?)
  `).run(req.user?.id || 1, name, Number(initialCash) || 0, notes);

  const shift = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(result.lastInsertRowid);
  res.json(getShiftLiveStats(db, shift));
});

// Close shift (Arqueo / Cierre Z)
router.post('/close', (req, res) => {
  const { shiftId, actualCash = 0, notes = '' } = req.body;
  const db = getDb();

  let shift = shiftId
    ? db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shiftId)
    : db.prepare("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1").get();

  if (!shift) {
    return res.status(404).json({ error: 'No hay turno abierto para cerrar' });
  }

  const stats = getShiftLiveStats(db, shift);
  const countedCash = Number(actualCash) || 0;
  const diff = countedCash - stats.expectedCash;

  db.prepare(`
    UPDATE cash_shifts SET
      status = 'closed',
      closed_at = datetime('now', '-5 hours'),
      expected_cash = ?,
      actual_cash = ?,
      difference = ?,
      total_cash_sales = ?,
      total_card_debit = ?,
      total_card_credit = ?,
      total_transfer = ?,
      total_sales = ?,
      total_orders = ?,
      notes = ?
    WHERE id = ?
  `).run(
    stats.expectedCash,
    countedCash,
    diff,
    stats.cashSales,
    stats.debitSales,
    stats.creditSales,
    stats.transferSales,
    stats.totalSales,
    stats.totalOrders,
    notes || shift.notes || '',
    shift.id
  );

  const closed = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shift.id);
  res.json({
    ...getShiftLiveStats(db, closed),
    difference: diff,
    actualCash: countedCash,
  });
});

// Shift history
router.get('/history', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM cash_shifts ORDER BY opened_at DESC LIMIT 30').all();
  res.json(rows);
});

module.exports = router;

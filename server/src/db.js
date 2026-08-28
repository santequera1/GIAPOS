const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    migrateSchema();
    seedIfEmpty();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'kitchen'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      price INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      description TEXT,
      sizes TEXT,
      color_bg TEXT,
      color_accent TEXT,
      featured INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      document_id TEXT DEFAULT '222222222222',
      email TEXT DEFAULT '',
      phone TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_company INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('dine-in', 'pickup', 'delivery')),
      status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('pending', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled')),
      customer_name TEXT NOT NULL DEFAULT 'Consumidor Final',
      customer_doc TEXT DEFAULT '222222222222',
      customer_email TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      customer_id INTEGER REFERENCES customers(id),
      is_electronic_invoice INTEGER DEFAULT 0,
      table_number INTEGER,
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card_debit', 'card_credit', 'card', 'transfer')),
      payment_status TEXT NOT NULL DEFAULT 'paid' CHECK(payment_status IN ('pending', 'paid')),
      cash_received INTEGER DEFAULT 0,
      cash_change INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '-5 hours')),
      driver_id INTEGER REFERENCES drivers(id),
      receipt_image TEXT,
      notes TEXT DEFAULT '',
      shift_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size TEXT,
      flavors TEXT,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cash_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      cashier_name TEXT NOT NULL,
      opened_at TEXT NOT NULL DEFAULT (datetime('now', '-5 hours')),
      closed_at TEXT,
      initial_cash INTEGER NOT NULL DEFAULT 0,
      expected_cash INTEGER DEFAULT 0,
      actual_cash INTEGER DEFAULT 0,
      difference INTEGER DEFAULT 0,
      total_cash_sales INTEGER DEFAULT 0,
      total_card_debit INTEGER DEFAULT 0,
      total_card_credit INTEGER DEFAULT 0,
      total_transfer INTEGER DEFAULT 0,
      total_sales INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function migrateSchema() {
  const addCol = (table, col, def) => {
    try {
      db.prepare(`SELECT ${col} FROM ${table} LIMIT 1`).get();
    } catch {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        console.log(`✅ Added ${col} to ${table}`);
      } catch (e) {
        // column may already exist
      }
    }
  };

  addCol('orders', 'customer_doc', "TEXT DEFAULT '222222222222'");
  addCol('orders', 'customer_email', "TEXT DEFAULT ''");
  addCol('orders', 'is_electronic_invoice', "INTEGER DEFAULT 0");
  addCol('orders', 'cash_received', "INTEGER DEFAULT 0");
  addCol('orders', 'cash_change', "INTEGER DEFAULT 0");
  addCol('orders', 'discount', "INTEGER DEFAULT 0");
  addCol('orders', 'shift_id', "INTEGER");
  addCol('orders', 'notes', "TEXT DEFAULT ''");
  addCol('orders', 'receipt_image', "TEXT");

  addCol('order_items', 'size', "TEXT");
  addCol('order_items', 'flavors', "TEXT");

  addCol('products', 'color_bg', "TEXT");
  addCol('products', 'color_accent', "TEXT");
  addCol('products', 'featured', "INTEGER DEFAULT 0");
  addCol('products', 'sizes', "TEXT");

  addCol('customers', 'document_id', "TEXT DEFAULT '222222222222'");
  addCol('customers', 'email', "TEXT DEFAULT ''");
  addCol('customers', 'is_company', "INTEGER DEFAULT 0");
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count > 0) return;

  console.log('🌱 Seeding Gia Gelatería database...');

  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', hash('GiaAdmin2026*'), 'Administrador', 'admin');
  insertUser.run('cajero', hash('GiaPos2026*'), 'Caja Convención', 'cashier');
  insertUser.run('cocina', hash('GiaCocina2026*'), 'Despacho', 'kitchen');

  // Categories Gia Gelatería
  const insertCat = db.prepare('INSERT INTO categories (id, name, emoji, color) VALUES (?, ?, ?, ?)');
  const cats = [
    [1, 'Clásicos',            '🍨', '#C6BF81'],
    [2, 'Frutales',            '🍓', '#E87A90'],
    [3, 'Especiales',          '✨', '#D4A373'],
    [4, 'Bebidas & Café',      '☕', '#364266'],
    [5, 'Acompañamientos',     '🧇', '#897863'],
  ];
  for (const c of cats) insertCat.run(...c);

  // Products & Gelatos
  const insertProd = db.prepare(`
    INSERT INTO products (id, name, category_id, price, available, image, description, sizes, color_bg, color_accent, featured)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
  `);

  const gelatoSizes = JSON.stringify([
    { name: 'Pequeño (1 sabor)', price: 15000 },
    { name: 'Grande (2 sabores)', price: 21000 },
    { name: 'Litro (2 sabores)', price: 70000 },
  ]);

  const prods = [
    // 12 SABORES OFICIALES GIA GELATERÍA
    [1,  'Pistacho',            1, 15000, '/images/gelatos/pistacho.webp',        'Auténtica pasta de pistacho italiana',   gelatoSizes, '#E7EAD9', '#7C8455', 1],
    [2,  'Chocolate',           1, 15000, '/images/gelatos/chocolate.webp',       'Intenso, cremoso y clásico cacao',      gelatoSizes, '#EAD9CB', '#6B4226', 1],
    [3,  'Avellana',            1, 15000, '/images/gelatos/avellana.webp',        'Avellana tostada y cremosa piamontesa', gelatoSizes, '#EFE0D1', '#8B5E3C', 0],
    [4,  'Vainilla',            1, 15000, '/images/gelatos/vainilla.webp',        'Clásica, suave y aromática',            gelatoSizes, '#F7EED8', '#C9A24B', 0],
    [5,  'Stracciatella',       1, 15000, '/images/gelatos/stracciatella.webp',   'Fior di latte y chispas de chocolate',  gelatoSizes, '#F1EEE7', '#4A4A4A', 1],

    [6,  'Corozo',              2, 15000, '/images/gelatos/corozo.webp',          'Fruto auténtico y refrescante del Caribe', gelatoSizes, '#F7D9DE', '#B03A5B', 1],
    [7,  'Maracuyá',            2, 15000, '/images/gelatos/maracuya.webp',        'Cítrico, tropical y refrescante',       gelatoSizes, '#FBEFCF', '#D9A220', 1],
    [8,  'Maracuyá y Corozo',   2, 15000, '/images/gelatos/maracuya-corozo.webp', 'Dúo cítrico caribeño inolvidable',     gelatoSizes, '#FAE3D0', '#C75B3F', 0],
    [9,  'Yogurt con Amarenas', 2, 15000, '/images/gelatos/yogurt-amarenas.webp', 'Yogurt artesanal con cerezas amarena', gelatoSizes, '#F6DFE3', '#A03B52', 1],

    [10, 'Milo',                3, 15000, '/images/gelatos/milo.webp',            'El favorito crujiente de casa',         gelatoSizes, '#EDDECC', '#7A5230', 1],
    [11, 'Arroz con Leche',     3, 15000, '/images/gelatos/arroz-con-leche.webp', 'Sabor tradicional de la abuela con canela', gelatoSizes, '#F3EBDA', '#B99B62', 0],
    [12, 'Coco y Almendra',     3, 15000, '/images/gelatos/coco-almendra.webp',   'Cremoso con tropezones crocantes',      gelatoSizes, '#F4F0E6', '#A48B5F', 0],

    // BEBIDAS & CAFÉ (cat 4)
    [13, 'Café Espresso',       4,  4000, null, 'Espresso italiano clásico', null, null, null, 0],
    [14, 'Café Americano',      4,  5000, null, 'Café suave recién tostado', null, null, null, 0],
    [15, 'Capuchino Artesanal', 4,  7000, null, 'Espresso con leche texturizada', null, null, null, 0],
    [16, 'Agua Mineral / Gas',  4,  5000, null, 'Botella 500ml', null, null, null, 0],

    // ACOMPAÑAMIENTOS (cat 5)
    [17, 'Cono Waffle Crocante',5,  2500, null, 'Cono artesanal recién horneado', null, null, null, 0],
    [18, 'Topping de Pistacho', 5,  3000, null, 'Pistacho picado tostado', null, null, null, 0],
    [19, 'Salsa de Chocolate',  5,  2000, null, 'Salsa tibia de cacao artesanal', null, null, null, 0],
  ];

  for (const p of prods) insertProd.run(...p);

  // Default Generic Customer (Consumidor Final 222222222222)
  const insertCust = db.prepare(`
    INSERT INTO customers (id, name, document_id, email, phone, address, notes, is_company)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCust.run(1, 'Consumidor Final', '222222222222', 'cliente@giagelateria.com', '3000000000', 'Punto de Venta', 'Cliente genérico mostrador', 0);
  insertCust.run(2, 'Empresa Ejemplo S.A.S', '901234567-8', 'contabilidad@ejemplo.com', '3109998877', 'Cra 5 #10-20', 'Factura Electrónica', 1);

  // Staff / Cajeros
  const insertDriver = db.prepare('INSERT INTO drivers (name, phone, available) VALUES (?, ?, 1)');
  insertDriver.run('cajero:Cajero 1 (Principal)', '3001112233');
  insertDriver.run('cajero:Cajero 2 (Apoyo)', '3002223344');

  // Settings
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('businessName', 'Gia Gelatería');
  insertSetting.run('businessSlogan', 'Auténtico Gelato artesanal');
  insertSetting.run('businessAddress', 'Calle Baloco #2-22, Centro Histórico, Cartagena');
  insertSetting.run('businessPhone', '300 785 6068');
  insertSetting.run('businessNit', '901.824.123-1');
  insertSetting.run('deliveryFee', '5000');
  insertSetting.run('tableCount', '8');
  insertSetting.run('invoicePrefix', 'GIA-POS');

  // Initial Open Cash Shift for the event
  const insertShift = db.prepare(`
    INSERT INTO cash_shifts (id, user_id, cashier_name, opened_at, initial_cash, status, notes)
    VALUES (1, 2, 'Caja Convención', datetime('now', '-5 hours'), 100000, 'open', 'Turno inicial convención')
  `);
  insertShift.run();

  // Seed sample initial convention orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, type, status, customer_name, customer_doc, customer_email, customer_phone, customer_address,
      table_number, subtotal, delivery_fee, discount, total, payment_method, payment_status,
      cash_received, cash_change, created_at, shift_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, size, flavors, quantity, price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const iso = (minAgo) => new Date(now.getTime() - minAgo * 60000).toISOString().replace('T', ' ').slice(0, 19);

  // Sample order 1 - Efectivo Pequeño
  insertOrder.run(1001, 'pickup', 'delivered', 'Consumidor Final', '222222222222', '', '3000000000', '', null, 15000, 0, 0, 15000, 'cash', 'paid', 20000, 5000, iso(45));
  insertItem.run(1001, 1, 'Gelato Pequeño - Pistacho', 'Pequeño (1 sabor)', 'Pistacho', 1, 15000, '');

  // Sample order 2 - Datáfono Débito Grande 2 sabores
  insertOrder.run(1002, 'dine-in', 'delivered', 'Consumidor Final', '222222222222', '', '', '', 2, 21000, 0, 0, 21000, 'card_debit', 'paid', 0, 0, iso(25));
  insertItem.run(1002, 10, 'Gelato Grande - Milo + Maracuyá', 'Grande (2 sabores)', 'Milo, Maracuyá', 1, 21000, '');

  // Sample order 3 - Transferencia Nequi
  insertOrder.run(1003, 'pickup', 'delivered', 'Carlos Mendoza', '1047456789', 'carlos@email.com', '3001234567', '', null, 36000, 0, 0, 36000, 'transfer', 'paid', 0, 0, iso(10));
  insertItem.run(1003, 6, 'Gelato Pequeño - Corozo', 'Pequeño (1 sabor)', 'Corozo', 1, 15000, '');
  insertItem.run(1003, 1, 'Gelato Grande - Pistacho + Stracciatella', 'Grande (2 sabores)', 'Pistacho, Stracciatella', 1, 21000, '');

  console.log('✅ Gia Gelatería database seeded successfully');
}

module.exports = { getDb };


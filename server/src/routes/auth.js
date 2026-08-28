const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { generateToken } = require('../auth');

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { name: user.name, role: user.role },
  });
});

module.exports = router;

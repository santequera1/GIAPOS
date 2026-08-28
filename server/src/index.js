const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { getDb } = require('./db');
const { authMiddleware } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});

// Make io accessible in routes
app.io = io;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/categories', authMiddleware, require('./routes/categories'));
app.use('/api/products', authMiddleware, require('./routes/products'));
app.use('/api/customers', authMiddleware, require('./routes/customers'));
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));
app.use('/api/shifts', authMiddleware, require('./routes/shifts'));
app.use('/api/settings', authMiddleware, require('./routes/settings'));
app.use('/api/drivers', authMiddleware, require('./routes/drivers'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', business: 'GIA Gelatería' }));

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🍦 GIA Gelatería Backend running on http://localhost:${PORT}`);
});

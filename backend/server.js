require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const { getProfile } = require('./controllers/authController');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Also exposed at the top-level path exactly as specified, in addition to /api/auth/profile
app.get('/api/profile', requireAuth, getProfile);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Static frontend ----
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

// ---- 404 for unknown API routes ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---- Central error handler ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`HealthGuard AI backend listening on http://localhost:${PORT}`);
});

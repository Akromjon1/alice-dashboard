require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ── Security: require API_TOKEN ──
if (!process.env.API_TOKEN) {
  console.error('FATAL: API_TOKEN environment variable is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3456;

// ── Middleware ──
app.use(cors({
  origin: [
    'https://alice-dashboard-rho.vercel.app',
    'http://localhost:5173',
  ],
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json());
app.use(require('./middleware/auth'));

// ── Routes ──
app.use(require('./routes/system'));
app.use(require('./routes/tasks'));
app.use(require('./routes/projects'));
app.use(require('./routes/agents'));
app.use(require('./routes/matches'));
app.use(require('./routes/youtube'));
app.use(require('./routes/cron'));
app.use(require('./routes/notes'));
app.use(require('./routes/model-roles'));
app.use(require('./routes/activity'));
app.use(require('./routes/chat'));
app.use(require('./routes/scheduler'));
app.use(require('./routes/plan'));
app.use(require('./routes/trello'));

// ── Start scheduler ──
const scheduler = require('./scheduler');
scheduler.start();

// ── Start Trello poller ──
const trelloPoller = require('./trello-poller');
trelloPoller.start();

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('[error]', err.stack || err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alice API server running on port ${PORT}`);
});

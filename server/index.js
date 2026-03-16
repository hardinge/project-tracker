import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './auth.js';
import rowsRouter from './rows.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Auth routes — unprotected
app.use('/api/auth', authRouter);

// Guard all other /api routes
app.use('/api', (req, res, next) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

app.use('/api/rows', rowsRouter);

// Serve Vite production build
app.use(express.static(join(__dirname, '../dist')));
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Project Tracker running → http://localhost:${PORT}`);
});

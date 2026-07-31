import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import rateLimit from 'express-rate-limit';
import * as db from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// Auth endpoints are the most common brute-force / credential-stuffing
// target, so they get a much tighter rate limit than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [id, email.toLowerCase(), passwordHash, name || null]);

    // Seed a couple of default folders for a friendlier first run.
    const defaultFolders = [
      { id: uuid(), name: 'Reading List', color: '#A87C43' },
      { id: uuid(), name: 'Archive', color: '#4A5D53' },
    ];
    for (const f of defaultFolders) {
      await db.run('INSERT INTO folders (id, user_id, name, color) VALUES (?, ?, ?, ?)', [f.id, id, f.name, f.color]);
    }

    const user = { id, email: email.toLowerCase() };
    const token = signToken(user);
    res.status(201).json({ token, user: { id, email: user.email, name: name || null } });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const row = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: row.id, email: row.email });
    res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const row = await db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: row });
  } catch (err) { next(err); }
});

export default router;

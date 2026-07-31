import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import folderRoutes from './routes/folders.js';
import tagRoutes from './routes/tags.js';
import itemRoutes from './routes/items.js';
import reviewRoutes from './routes/review.js';
import { JWT_SECRET } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Startup safety checks - refuse to boot with an insecure config in production.
// ---------------------------------------------------------------------------
if (isProd) {
  if (!JWT_SECRET || JWT_SECRET === 'dev-secret-change-me') {
    console.error('FATAL: JWT_SECRET must be set to a strong, unique value in production. Refusing to start.');
    process.exit(1);
  }
  if (!process.env.CORS_ORIGIN) {
    console.error('FATAL: CORS_ORIGIN must be set to your frontend origin(s) in production. Refusing to start.');
    process.exit(1);
  }
}

// Trust the first proxy hop (nginx/ALB/Cloudflare) so req.ip and rate
// limiting see the real client IP instead of the proxy's.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.use(helmet({
  // Uploaded PDFs and thumbnails are served cross-origin to the frontend.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header) and anything on the allow-list.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// General API rate limit - generous, just a backstop against abuse/bugs.
// Auth-specific endpoints have their own tighter limiter (see routes/auth.js).
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'knowledge-vault-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/review', reviewRoutes);

// Central error handler (e.g. multer file-type/size errors, CORS rejections)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Knowledge Vault API listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
});

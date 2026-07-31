import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import * as db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchUrlMetadata, extractYoutubeId } from '../utils/metadata.js';
import { saveFile, deleteFile } from '../utils/storage.js';

// Files are buffered in memory, then handed to the storage driver (local
// disk in dev, S3-compatible object storage in production) - see utils/storage.js.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are supported'));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function attachTags(itemId, tagNames, userId) {
  if (!Array.isArray(tagNames)) return;
  await db.run('DELETE FROM item_tags WHERE item_id = ?', [itemId]);

  for (const raw of tagNames) {
    const name = String(raw).trim().toLowerCase();
    if (!name) continue;

    let tag = await db.get('SELECT * FROM tags WHERE user_id = ? AND name = ?', [userId, name]);
    if (!tag) {
      const id = uuid();
      await db.run('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)', [id, userId, name]);
      tag = { id };
    }

    const existingLink = await db.get('SELECT 1 FROM item_tags WHERE item_id = ? AND tag_id = ?', [itemId, tag.id]);
    if (!existingLink) {
      await db.run('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)', [itemId, tag.id]);
    }
  }
}

async function getTagsForItem(itemId) {
  return db.all(
    `SELECT t.id, t.name FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = ?`,
    [itemId]
  );
}

async function serializeItem(item) {
  return { ...item, is_favorite: !!item.is_favorite, tags: await getTagsForItem(item.id) };
}

// ---------------------------------------------------------------------------
// List / filter / search
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { folder_id, tag, favorite, type, q } = req.query;
    let rows;

    if (q && q.trim()) {
      rows = await db.searchItems({ userId: req.user.id, query: q.trim(), folderId: folder_id, type });
      if (favorite === 'true') rows = rows.filter((r) => !!r.is_favorite);
    } else {
      const clauses = ['user_id = ?'];
      const params = [req.user.id];
      if (folder_id) { clauses.push('folder_id = ?'); params.push(folder_id); }
      if (favorite === 'true') { clauses.push('is_favorite = 1'); }
      if (type) { clauses.push('type = ?'); params.push(type); }
      rows = await db.all(`SELECT * FROM items WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`, params);
    }

    if (tag) {
      const filtered = [];
      for (const r of rows) {
        const rowTags = await getTagsForItem(r.id);
        if (rowTags.some((t) => t.name === tag.toLowerCase())) filtered.push(r);
      }
      rows = filtered;
    }

    res.json({ items: await Promise.all(rows.map(serializeItem)) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: await serializeItem(item) });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Create: note (manual), or url (article/youtube, auto-fetched)
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { type, url, title, content, folder_id, tags } = req.body || {};

    if (!type || !['note', 'article', 'youtube'].includes(type)) {
      return res.status(400).json({ error: "type must be one of 'note', 'article', 'youtube'" });
    }

    const id = uuid();
    const now = new Date().toISOString();
    let resolvedType = type;
    let resolvedTitle = title || 'Untitled';
    let excerpt = null;
    let thumbnail = null;
    let resolvedContent = content || null;

    if (type === 'note') {
      if (!content || !content.trim()) return res.status(400).json({ error: 'Note content is required' });
      excerpt = content.trim().slice(0, 200);
    } else {
      if (!url || !url.trim()) return res.status(400).json({ error: 'url is required for articles and videos' });
      try {
        const meta = await fetchUrlMetadata(url.trim());
        resolvedType = meta.type;
        resolvedTitle = title || meta.title;
        excerpt = meta.excerpt;
        thumbnail = meta.thumbnail;
        resolvedContent = meta.content || null;
      } catch (err) {
        resolvedTitle = title || url.trim();
        const ytId = extractYoutubeId(url.trim());
        if (ytId) {
          resolvedType = 'youtube';
          thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
      }
    }

    await db.run(
      `INSERT INTO items (id, user_id, folder_id, type, title, url, content, excerpt, thumbnail, file_path, next_review_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, folder_id || null, resolvedType, resolvedTitle, url || null, resolvedContent, excerpt, thumbnail, null, now, now, now]
    );

    if (tags) await attachTags(id, tags, req.user.id);

    const item = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    res.status(201).json({ item: await serializeItem(item) });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Create: PDF upload
// ---------------------------------------------------------------------------
router.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A PDF file is required' });

    const { title, folder_id, tags } = req.body || {};
    const id = uuid();
    const now = new Date().toISOString();     
    let extractedText = null;
    let pageCount = null;

    // console.log("1. Upload received");

    // console.log(req.file);

    
    try {
      // console.log("2. Starting pdf parse");
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(req.file.buffer);

      // console.log("3. PDF parsed");
      extractedText = data.text?.slice(0, 20000) || null;
      pageCount = data.numpages || null;
    } catch (err) {
      // If parsing fails, we still keep the uploaded file itself.
    }

    const { url: fileUrl, key: fileKey } = await saveFile(req.file.buffer, req.file.originalname);

    await db.run(
      `INSERT INTO items (id, user_id, folder_id, type, title, content, excerpt, file_path, file_key, next_review_at, created_at, updated_at)
       VALUES (?, ?, ?, 'pdf', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.user.id, folder_id || null,
        title || req.file.originalname.replace(/\.pdf$/i, ''),
        extractedText,
        pageCount ? `${pageCount} pages` : 'PDF document',
        fileUrl, fileKey, now, now, now,
      ]
    );

    const parsedTags = (() => { try { return JSON.parse(tags); } catch { return typeof tags === 'string' ? [tags] : []; } })();
    if (parsedTags?.length) await attachTags(id, parsedTags, req.user.id);

    const item = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    res.status(201).json({ item: await serializeItem(item) });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res, next) => {
  try {
    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const { title, content, excerpt, folder_id, tags } = req.body || {};
    await db.run(
      `UPDATE items SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        excerpt = COALESCE(?, excerpt),
        folder_id = ?,
        updated_at = ?
       WHERE id = ?`,
      [title, content, excerpt, folder_id !== undefined ? folder_id : item.folder_id, new Date().toISOString(), item.id]
    );

    if (tags) await attachTags(item.id, tags, req.user.id);

    const updated = await db.get('SELECT * FROM items WHERE id = ?', [item.id]);
    res.json({ item: await serializeItem(updated) });
  } catch (err) { next(err); }
});

router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const next_ = item.is_favorite ? 0 : 1;
    await db.run('UPDATE items SET is_favorite = ?, updated_at = ? WHERE id = ?', [next_, new Date().toISOString(), item.id]);
    res.json({ item: await serializeItem(await db.get('SELECT * FROM items WHERE id = ?', [item.id])) });
  } catch (err) { next(err); }
});

router.patch('/:id/progress', async (req, res, next) => {
  try {
    const { progress } = req.body || {};
    const p = Math.max(0, Math.min(100, Number(progress)));
    if (Number.isNaN(p)) return res.status(400).json({ error: 'progress must be a number between 0 and 100' });

    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await db.run('UPDATE items SET progress = ?, updated_at = ? WHERE id = ?', [p, new Date().toISOString(), item.id]);
    res.json({ item: await serializeItem(await db.get('SELECT * FROM items WHERE id = ?', [item.id])) });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.file_key) {
      deleteFile(item.file_key).catch(() => {});
    }
    await db.run('DELETE FROM items WHERE id = ?', [item.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;

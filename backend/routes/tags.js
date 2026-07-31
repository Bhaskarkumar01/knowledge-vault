import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import * as db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const tags = await db.all(
      `SELECT t.*, (SELECT COUNT(*) FROM item_tags it WHERE it.tag_id = t.id) AS item_count
       FROM tags t WHERE t.user_id = ? ORDER BY t.name ASC`,
      [req.user.id]
    );
    res.json({ tags });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tag name is required' });
    const clean = name.trim().toLowerCase();

    let tag = await db.get('SELECT * FROM tags WHERE user_id = ? AND name = ?', [req.user.id, clean]);
    if (!tag) {
      const id = uuid();
      await db.run('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)', [id, req.user.id, clean]);
      tag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
    }
    res.status(201).json({ tag });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    await db.run('DELETE FROM tags WHERE id = ?', [tag.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;

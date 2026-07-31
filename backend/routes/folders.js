import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import * as db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const folders = await db.all(
      `SELECT f.*, (SELECT COUNT(*) FROM items i WHERE i.folder_id = f.id) AS item_count
       FROM folders f WHERE f.user_id = ? ORDER BY f.created_at ASC`,
      [req.user.id]
    );
    res.json({ folders });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, parent_id, color } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Folder name is required' });

    const id = uuid();
    await db.run('INSERT INTO folders (id, user_id, name, parent_id, color) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, name.trim(), parent_id || null, color || '#A87C43']);
    const folder = await db.get('SELECT * FROM folders WHERE id = ?', [id]);
    res.status(201).json({ folder });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const folder = await db.get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const { name, color, parent_id } = req.body || {};
    await db.run(
      'UPDATE folders SET name = COALESCE(?, name), color = COALESCE(?, color), parent_id = ? WHERE id = ?',
      [name, color, parent_id ?? folder.parent_id, folder.id]
    );
    res.json({ folder: await db.get('SELECT * FROM folders WHERE id = ?', [folder.id]) });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const folder = await db.get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    await db.run('DELETE FROM folders WHERE id = ?', [folder.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;

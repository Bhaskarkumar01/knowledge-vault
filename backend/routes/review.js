import { Router } from 'express';
import * as db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Spaced-repetition-ish intervals, in days, indexed by how many times reviewed.
const INTERVALS = [1, 3, 7, 14, 30, 60, 90];

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

// Today's review queue: due items first, then unfinished favorites, then
// recently added unfinished items, capped at 12 so the daily review stays light.
router.get('/today', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const nowIso = new Date().toISOString();

    const due = await db.all(
      `SELECT * FROM items
       WHERE user_id = ? AND next_review_at IS NOT NULL AND next_review_at <= ?
       ORDER BY next_review_at ASC LIMIT 12`,
      [userId, nowIso]
    );

    const seen = new Set(due.map((i) => i.id));
    let queue = [...due];

    if (queue.length < 12) {
      const favorites = await db.all(
        `SELECT * FROM items WHERE user_id = ? AND is_favorite = 1 AND progress < 100
         ORDER BY updated_at ASC LIMIT ?`,
        [userId, 12 - queue.length]
      );
      for (const f of favorites) {
        if (!seen.has(f.id)) { queue.push(f); seen.add(f.id); }
      }
    }

    if (queue.length < 12) {
      const recent = await db.all(
        `SELECT * FROM items WHERE user_id = ? AND progress < 100
         ORDER BY created_at DESC LIMIT ?`,
        [userId, 12 - queue.length]
      );
      for (const r of recent) {
        if (!seen.has(r.id)) { queue.push(r); seen.add(r.id); }
      }
    }

    const stats = await db.get(
      `SELECT
         (SELECT COUNT(*) FROM items WHERE user_id = ?) AS total,
         (SELECT COUNT(*) FROM items WHERE user_id = ? AND progress = 100) AS completed,
         (SELECT COUNT(*) FROM items WHERE user_id = ? AND is_favorite = 1) AS favorites
      `,
      [userId, userId, userId]
    );

    res.json({ queue: await Promise.all(queue.map(serializeItem)), stats });
  } catch (err) { next(err); }
});

// Mark an item as reviewed today; schedules the next review date.
router.post('/:id/complete', async (req, res, next) => {
  try {
    const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const nextCount = item.review_count + 1;
    const days = INTERVALS[Math.min(nextCount - 1, INTERVALS.length - 1)];
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    await db.run(
      `UPDATE items SET
         review_count = ?,
         last_reviewed_at = ?,
         next_review_at = ?,
         updated_at = ?
       WHERE id = ?`,
      [nextCount, now.toISOString(), nextReviewAt, now.toISOString(), item.id]
    );

    const updated = await db.get('SELECT * FROM items WHERE id = ?', [item.id]);
    res.json({ item: await serializeItem(updated), next_review_in_days: days });
  } catch (err) { next(err); }
});

export default router;

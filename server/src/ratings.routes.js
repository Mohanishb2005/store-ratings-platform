import { Router } from 'express';
import { pool } from './db.js';
import { authenticate, allowRoles } from './middleware.js';

const router = Router();
router.use(authenticate, allowRoles('USER'));

router.put('/:storeId', async (req, res, next) => {
  try {
    const score = Number(req.body.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
    const store = await pool.query('SELECT id FROM stores WHERE id=$1', [req.params.storeId]);
    if (!store.rowCount) return res.status(404).json({ error: 'Store not found.' });
    const result = await pool.query(`INSERT INTO ratings(user_id,store_id,score) VALUES($1,$2,$3)
      ON CONFLICT(user_id,store_id) DO UPDATE SET score=EXCLUDED.score, updated_at=NOW()
      RETURNING id,store_id,score,updated_at`, [req.user.id, req.params.storeId, score]);
    res.json({ rating: result.rows[0] });
  } catch (e) { next(e); }
});
export default router;

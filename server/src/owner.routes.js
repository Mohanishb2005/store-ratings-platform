import { Router } from 'express';
import { pool } from './db.js';
import { authenticate, allowRoles } from './middleware.js';

const router = Router();
router.use(authenticate, allowRoles('OWNER'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const stores = await pool.query(`SELECT s.id,s.name,s.address,ROUND(AVG(r.score)::numeric,2) AS avg_rating,
      COUNT(r.id)::int AS rating_count
      FROM stores s LEFT JOIN ratings r ON r.store_id=s.id
      WHERE s.owner_id=$1 GROUP BY s.id ORDER BY s.name`, [req.user.id]);
    const ratings = await pool.query(`SELECT r.id,r.score,r.updated_at,u.id AS user_id,u.name AS user_name,u.email AS user_email,
      s.id AS store_id,s.name AS store_name
      FROM ratings r JOIN users u ON u.id=r.user_id JOIN stores s ON s.id=r.store_id
      WHERE s.owner_id=$1 ORDER BY r.updated_at DESC`, [req.user.id]);
    res.json({ stores: stores.rows, ratings: ratings.rows });
  } catch (e) { next(e); }
});
export default router;

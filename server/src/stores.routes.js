import { Router } from 'express';
import { pool } from './db.js';
import { authenticate, allowRoles } from './middleware.js';
import { validateEmail } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search = '', name = '', address = '', email = '', role = '', sortBy = 'name', order = 'asc', page = '1', limit = '100' } = req.query;
    const allowedSort = { name: 's.name', email: 's.email', address: 's.address', rating: 'avg_rating', createdAt: 's.created_at' };
    const sort = allowedSort[sortBy] || allowedSort.name;
    const direction = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));
    const values = [];
    const where = [];
    const add = (field, value) => { if (value) { values.push(`%${String(value).slice(0, 200)}%`); where.push(`${field} ILIKE $${values.length}`); } };
    add('s.name', name); add('s.address', address); add('s.email', email);
    if (search) { values.push(`%${String(search).slice(0, 200)}%`); where.push(`(s.name ILIKE $${values.length} OR s.address ILIKE $${values.length})`); }
    const scopedWhere = [...where];
    if (req.user.role === 'OWNER') {
      values.push(req.user.id);
      scopedWhere.push(`s.owner_id=$${values.length}`);
    }
    const clause = scopedWhere.length ? `WHERE ${scopedWhere.join(' AND ')}` : '';
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM stores s ${clause}`, values);
    const listValues = [...values];
    let userRatingExpr = 'NULL';
    if (req.user.role === 'USER') {
      listValues.push(req.user.id);
      userRatingExpr = `MAX(CASE WHEN r.user_id=$${listValues.length} THEN r.score END)`;
    }
    listValues.push(l, (p - 1) * l);
    const limitPos = listValues.length - 1;
    const offsetPos = listValues.length;
    const result = await pool.query(`SELECT s.id,s.name,s.email,s.address,s.owner_id,s.created_at,
      ROUND(AVG(r.score)::numeric,2) AS avg_rating, COUNT(r.id)::int AS rating_count,
      ${userRatingExpr} AS user_rating
      FROM stores s LEFT JOIN ratings r ON r.store_id=s.id ${clause}
      GROUP BY s.id ORDER BY ${sort} ${direction} LIMIT $${limitPos} OFFSET $${offsetPos}`, listValues);
    res.json({ items: result.rows, total: count.rows[0].total, page: p, limit: l });
  } catch (e) { next(e); }
});

router.post('/', allowRoles('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, address, ownerId = null } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) return res.status(400).json({ error: 'Store name is required (maximum 120 characters).' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid store email.' });
    if (typeof address !== 'string' || address.trim().length > 400) return res.status(400).json({ error: 'Address must be at most 400 characters.' });
    if (ownerId) {
      const owner = await pool.query("SELECT id FROM users WHERE id=$1 AND role='OWNER'", [ownerId]);
      if (!owner.rowCount) return res.status(400).json({ error: 'ownerId must refer to a Store Owner account.' });
    }
    const result = await pool.query('INSERT INTO stores(name,email,address,owner_id) VALUES($1,$2,$3,$4) RETURNING *',
      [name.trim(), email.trim().toLowerCase(), address.trim(), ownerId]);
    res.status(201).json({ store: result.rows[0] });
  } catch (e) { next(e); }
});
export default router;

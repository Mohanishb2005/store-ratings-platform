import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { allowRoles, authenticate } from './middleware.js';
import { validateUserInput, validateEmail } from './validation.js';

const router = Router();
router.use(authenticate, allowRoles('ADMIN'));

router.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT
      (SELECT COUNT(*) FROM users)::int AS users,
      (SELECT COUNT(*) FROM stores)::int AS stores,
      (SELECT COUNT(*) FROM ratings)::int AS ratings`);
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

router.get('/users', async (req, res, next) => {
  try {
    const { search = '', name = '', email = '', address = '', role = '', sortBy = 'name', order = 'asc', page = '1', limit = '20' } = req.query;
    const allowedSort = { name: 'u.name', email: 'u.email', address: 'u.address', role: 'u.role', createdAt: 'u.created_at' };
    const sort = allowedSort[sortBy] || allowedSort.name;
    const direction = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const values = [];
    const where = [];
    const add = (field, value) => { if (value) { values.push(`%${String(value).slice(0, 200)}%`); where.push(`${field} ILIKE $${values.length}`); } };
    add('u.name', name); add('u.email', email); add('u.address', address);
    if (search) { values.push(`%${String(search).slice(0, 200)}%`); where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.address ILIKE $${values.length})`); }
    if (['ADMIN','USER','OWNER'].includes(String(role).toUpperCase())) { values.push(String(role).toUpperCase()); where.push(`u.role=$${values.length}`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM users u ${clause}`, values);
    values.push(l, (p - 1) * l);
    const result = await pool.query(`SELECT u.id,u.name,u.email,u.address,u.role,u.created_at,
      CASE WHEN u.role='OWNER' THEN (SELECT ROUND(AVG(r.score)::numeric,2) FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.owner_id=u.id) ELSE NULL END AS rating
      FROM users u ${clause} ORDER BY ${sort} ${direction} LIMIT $${values.length-1} OFFSET $${values.length}`, values);
    res.json({ items: result.rows, total: count.rows[0].total, page: p, limit: l });
  } catch (e) { next(e); }
});

router.post('/users', async (req, res, next) => {
  try {
    const errors = validateUserInput(req.body, { requireRole: true });
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    const hash = await bcrypt.hash(req.body.password, 12);
    const result = await pool.query(
      'INSERT INTO users(name,email,address,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,address,role',
      [req.body.name.trim(), req.body.email.trim().toLowerCase(), req.body.address.trim(), hash, req.body.role]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (e) { next(e); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT u.id,u.name,u.email,u.address,u.role,u.created_at,
      CASE WHEN u.role='OWNER' THEN (SELECT ROUND(AVG(r.score)::numeric,2) FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.owner_id=u.id) ELSE NULL END AS rating
      FROM users u WHERE u.id=$1`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (e) { next(e); }
});
export default router;

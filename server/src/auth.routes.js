import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { authenticate } from './middleware.js';
import { validateUserInput, validatePassword, validateEmail, validateName, validateAddress } from './validation.js';

const router = Router();
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, address: row.address, role: row.role });

router.post('/register', async (req, res, next) => {
  try {
    const input = { ...req.body, role: 'USER' };
    const errors = validateUserInput(input);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    const hash = await bcrypt.hash(input.password, 12);
    const result = await pool.query(
      'INSERT INTO users(name,email,address,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,address,role',
      [input.name.trim(), input.email.trim().toLowerCase(), input.address.trim(), hash, 'USER']
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!validateEmail(email) || typeof password !== 'string') return res.status(400).json({ error: 'Enter a valid email and password.' });
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,email,address,role FROM users WHERE id=$1', [req.user.id]);
    if (!result.rowCount) return res.status(401).json({ error: 'User no longer exists.' });
    res.json({ user: result.rows[0] });
  } catch (e) { next(e); }
});

router.patch('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const error = validatePassword(newPassword);
    if (error) return res.status(400).json({ error });
    const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!result.rowCount || !(await bcrypt.compare(currentPassword || '', result.rows[0].password_hash))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (e) { next(e); }
});

export default router;

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
dotenv.config();
try {
  const email = 'admin@example.com';
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (!existing.rowCount) {
    const hash = await bcrypt.hash('AdminPass!123', 12);
    await pool.query('INSERT INTO users(name,email,address,password_hash,role) VALUES($1,$2,$3,$4,$5)',
      ['Development System Administrator', email, 'Local development environment', hash, 'ADMIN']);
    console.log('Seeded admin: admin@example.com / AdminPass!123');
  } else console.log('Development admin already exists; no changes made.');
} finally { await pool.end(); }

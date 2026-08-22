'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.GAMEVAULT_DB_PATH || path.join(DATA_DIR, 'gamevault.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    balance_cents INTEGER NOT NULL DEFAULT 0 CHECK(balance_cents >= 0),
    deposit_cents INTEGER NOT NULL DEFAULT 0,
    won_cents INTEGER NOT NULL DEFAULT 0,
    withdrawn_cents INTEGER NOT NULL DEFAULT 0,
    played INTEGER NOT NULL DEFAULT 0,
    kyc TEXT NOT NULL DEFAULT 'pending',
    banned INTEGER NOT NULL DEFAULT 0,
    self_exclusion_until INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deposits (
    txid TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    pix_key TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'PENDING',
    provider TEXT,
    provider_id TEXT,
    provider_response_json TEXT,
    error_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_cents INTEGER NOT NULL CHECK(reward_cents > 0),
    active INTEGER NOT NULL DEFAULT 1,
    max_claims INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_claims (
    id TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    UNIQUE(task_id, user_id)
  );
`);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function transaction(callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function insertTransaction(userId, type, amountCents, description, referenceId = null) {
  return db.prepare(`
    INSERT INTO transactions(user_id, type, amount_cents, description, reference_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, amountCents, description, referenceId);
}

function createUser(email, name, password) {
  const normalizedEmail = String(email || '').toLowerCase();
  const isAdmin = Boolean(db.prepare('SELECT 1 FROM admins WHERE email = ?').get(normalizedEmail));
  const bonusCents = Number(
    isAdmin
      ? process.env.ADMIN_SIGNUP_BONUS_CENTS || 4000
      : process.env.SIGNUP_BONUS_CENTS || 2000
  );
  return transaction(() => {
    const info = db.prepare(`
      INSERT INTO users(email, password_hash, name, balance_cents)
      VALUES (?, ?, ?, ?)
    `).run(normalizedEmail, hashPassword(password), name, bonusCents);
    const userId = Number(info.lastInsertRowid);
    if (bonusCents > 0) {
      insertTransaction(userId, 'bonus', bonusCents, isAdmin ? 'Bônus cadastro administrador' : 'Bônus cadastro', `signup:${userId}`);
    }
    return userId;
  });
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance_cents / 100,
    deposit: user.deposit_cents / 100,
    won: user.won_cents / 100,
    withdrawn: user.withdrawn_cents / 100,
    played: user.played,
    kyc: user.kyc,
    banned: Boolean(user.banned),
    selfExclusionUntil: user.self_exclusion_until,
    createdAt: user.created_at
  };
}

function publicTransaction(row) {
  return {
    id: row.id,
    t: row.type,
    a: row.amount_cents / 100,
    d: row.description,
    dt: new Date(row.created_at + 'Z').toLocaleDateString('pt-BR'),
    createdAt: row.created_at
  };
}

function userTransactions(userId, limit = 50) {
  return db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?
  `).all(userId, limit).map(publicTransaction);
}

function seed() {
  const admins = [
    ['nicolas21301012@gmail.com', 'owner'],
    ['dohypemeno5@gmail.com', 'owner']
  ];
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmins = db.prepare('SELECT COUNT(*) AS count FROM admins').get().count;
  if (!existingAdmins) {
    const insertAdmin = db.prepare('INSERT INTO admins(email, password_hash, role) VALUES (?, ?, ?)');
    for (const [email, role] of admins) insertAdmin.run(email, hashPassword(password), role);
  }

  const taskCount = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
  if (!taskCount) {
    db.prepare(`
      INSERT INTO tasks(title, description, reward_cents, max_claims)
      VALUES (?, ?, ?, ?)
    `).run(
      'Divulgação no grupo',
      'Poste o material oficial no grupo configurado e envie o link da publicação para aprovação.',
      Number(process.env.DEFAULT_TASK_REWARD_CENTS || 1000),
      0
    );
  }
}

seed();

module.exports = {
  db,
  DB_PATH,
  transaction,
  insertTransaction,
  hashPassword,
  verifyPassword,
  createUser,
  getUserByEmail,
  getUserById,
  publicUser,
  publicTransaction,
  userTransactions
};

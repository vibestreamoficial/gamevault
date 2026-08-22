'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  db,
  transaction,
  insertTransaction,
  verifyPassword,
  createUser,
  getUserByEmail,
  getUserById,
  publicUser,
  userTransactions
} = require('./database');

const PORT = Number(process.env.PORT || 3000);
const PIX_KEY = process.env.PIX_KEY || 'fff503e1-60b3-457b-bdc4-ddf2c892cfda';
const PIX_NAME = process.env.PIX_NAME || 'White Vendas';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 12 * 60 * 60 * 1000);

function generatePixPayload(amountCents, txid) {
  const amount = (amountCents / 100).toFixed(2);
  let payload = '00020126580014br.gov.bcb.pix0136' + PIX_KEY + '0212GameVault Pay520400005303986540';
  payload += String(amount.length).padStart(2, '0') + amount;
  payload += '5802BR5913' + PIX_NAME.substring(0, 13) + '6009SAO PAULO62070503' + txid.substring(0, 3) + '6304';
  let crc = 0xFFFF;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index);
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function parseBody(request) {
  return new Promise(resolve => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function json(response, data, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Token'
  });
  response.end(JSON.stringify(data));
}

function validateCPF(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (Number(cpf[9]) !== digit) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return Number(cpf[10]) === digit;
}

function authenticateUser(request) {
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now());
  return session ? getUserById(session.user_id) : null;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,?)')
    .run(token, userId, Date.now() + SESSION_TTL_MS);
  return token;
}

function authenticateAdmin(request) {
  const header = String(request.headers['x-admin-token'] || '');
  const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = header || bearer;
  const session = db.prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?').get(token, Date.now());
  return Boolean(session);
}

async function handleApi(request, response, url) {
  const route = `${request.method} ${url.pathname}`;

  if (route === 'POST /api/auth/register') {
    const body = await parseBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    if (!email.includes('@') || name.length < 2 || password.length < 6) {
      return json(response, { error: 'Dados inválidos' }, 400);
    }
    if (getUserByEmail(email)) return json(response, { error: 'E-mail já cadastrado' }, 409);
    try {
      createUser(email, name, password);
    } catch {
      return json(response, { error: 'Não foi possível criar a conta' }, 500);
    }
    const user = getUserByEmail(email);
    return json(response, { success: true, token: createSession(user.id), user: publicUser(user) });
  }

  if (route === 'POST /api/auth/login') {
    const body = await parseBody(request);
    const user = getUserByEmail(body.email);
    if (!user || !verifyPassword(String(body.password || ''), user.password_hash)) {
      return json(response, { error: 'E-mail ou senha inválidos' }, 401);
    }
    if (user.banned) return json(response, { error: 'Conta banida' }, 403);
    return json(response, { success: true, token: createSession(user.id), user: publicUser(user) });
  }

  if (route === 'POST /api/admin/login') {
    const body = await parseBody(request);
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(String(body.email || '').toLowerCase());
    if (!admin || !verifyPassword(String(body.password || ''), admin.password_hash)) {
      return json(response, { error: 'Credenciais inválidas' }, 401);
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO admin_sessions(token,admin_id,expires_at) VALUES (?,?,?)')
      .run(token, admin.id, Date.now() + SESSION_TTL_MS);
    return json(response, { success: true, token, admin: { email: admin.email, role: admin.role } });
  }

  if (route === 'GET /api/tasks') {
    const tasks = db.prepare(`
      SELECT id,title,description,reward_cents,max_claims,
        (SELECT COUNT(*) FROM task_claims WHERE task_id=tasks.id) AS claim_count
      FROM tasks WHERE active=1 ORDER BY id DESC
    `).all().map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      reward: task.reward_cents / 100,
      maxClaims: task.max_claims,
      claimCount: task.claim_count
    }));
    return json(response, { success: true, tasks });
  }

  if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/claims') && request.method === 'POST') {
    const user = authenticateUser(request);
    if (!user) return json(response, { error: 'Não autenticado' }, 401);
    const taskId = Number(url.pathname.split('/')[3]);
    const task = db.prepare('SELECT * FROM tasks WHERE id=? AND active=1').get(taskId);
    if (!task) return json(response, { error: 'Tarefa não encontrada' }, 404);
    const claims = db.prepare('SELECT COUNT(*) AS count FROM task_claims WHERE task_id=?').get(taskId).count;
    if (task.max_claims > 0 && claims >= task.max_claims) return json(response, { error: 'Tarefa esgotada' }, 409);
    const id = `TC${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    try {
      db.prepare('INSERT INTO task_claims(id,task_id,user_id) VALUES (?,?,?)').run(id, taskId, user.id);
    } catch {
      return json(response, { error: 'Tarefa já solicitada' }, 409);
    }
    return json(response, { success: true, claimId: id, status: 'PENDING', reward: task.reward_cents / 100 });
  }

  const user = authenticateUser(request);
  if (route === 'GET /api/me') {
    if (!user) return json(response, { error: 'Não autenticado' }, 401);
    return json(response, { success: true, user: publicUser(user), transactions: userTransactions(user.id) });
  }

  if (route === 'GET /api/me/transactions') {
    if (!user) return json(response, { error: 'Não autenticado' }, 401);
    return json(response, { success: true, transactions: userTransactions(user.id) });
  }

  if (route === 'POST /api/deposits') {
    if (!user) return json(response, { error: 'Não autenticado' }, 401);
    const body = await parseBody(request);
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 50000) {
      return json(response, { error: 'Valor deve ser de R$ 1 a R$ 500' }, 400);
    }
    const txid = `GV${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payload = generatePixPayload(amountCents, txid);
    db.prepare('INSERT INTO deposits(txid,user_id,amount_cents,payload) VALUES (?,?,?,?)')
      .run(txid, user.id, amountCents, payload);
    return json(response, { success: true, txid, amount: amountCents / 100, payload, status: 'PENDING' });
  }

  if (route === 'POST /api/withdrawals') {
    if (!user) return json(response, { error: 'Não autenticado' }, 401);
    if (user.banned) return json(response, { error: 'Conta banida' }, 403);
    if (user.self_exclusion_until && user.self_exclusion_until > Date.now()) {
      return json(response, { error: 'Usuário em autoexclusão' }, 403);
    }
    const body = await parseBody(request);
    const pixKey = String(body.pixKey || '').trim();
    const fullName = String(body.fullName || '').trim();
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!fullName || !validateCPF(body.cpf)) return json(response, { error: 'Nome ou CPF inválido' }, 400);
    if (!pixKey || pixKey.length > 100 || /^000201/.test(pixKey) || pixKey.includes('BR.GOV.BCB.PIX')) {
      return json(response, { error: 'Use apenas CPF, e-mail, telefone ou EVP como chave Pix' }, 400);
    }
    if (!Number.isInteger(amountCents) || amountCents < 1000) {
      return json(response, { error: 'Saque mínimo R$ 10,00' }, 400);
    }

    const id = `WD${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    try {
      transaction(() => {
        const current = db.prepare('SELECT balance_cents FROM users WHERE id=?').get(user.id);
        if (!current || current.balance_cents < amountCents) {
          const error = new Error('Saldo insuficiente');
          error.statusCode = 400;
          throw error;
        }
        db.prepare('UPDATE users SET balance_cents=balance_cents-?, withdrawn_cents=withdrawn_cents+? WHERE id=?')
          .run(amountCents, amountCents, user.id);
        insertTransaction(user.id, 'withdraw', -amountCents, 'Saque LofiPay solicitado', id);
        db.prepare(`
          INSERT INTO withdrawals(id,user_id,full_name,cpf,pix_key,amount_cents)
          VALUES (?,?,?,?,?,?)
        `).run(id, user.id, fullName, String(body.cpf).replace(/\D/g, ''), pixKey, amountCents);
      });
    } catch (error) {
      return json(response, { error: error.message }, error.statusCode || 500);
    }
    const updated = getUserById(user.id);
    return json(response, {
      success: true,
      withdrawal: { id, amount: amountCents / 100, status: 'PENDING' },
      user: publicUser(updated)
    });
  }

  if (!authenticateAdmin(request)) return json(response, { error: 'Não autorizado' }, 401);

  if (route === 'GET /api/admin/overview') {
    const users = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
    const withdrawals = db.prepare(`
      SELECT w.*,u.email FROM withdrawals w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 200
    `).all();
    const deposits = db.prepare(`
      SELECT d.*,u.email FROM deposits d JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC LIMIT 200
    `).all();
    const claims = db.prepare(`
      SELECT c.*,u.email,t.title,t.reward_cents FROM task_claims c
      JOIN users u ON u.id=c.user_id JOIN tasks t ON t.id=c.task_id ORDER BY c.created_at DESC LIMIT 200
    `).all();
    const totals = db.prepare(`
      SELECT COUNT(*) AS total_users,COALESCE(SUM(balance_cents),0) AS total_balance,
             COALESCE(SUM(deposit_cents),0) AS total_deposit,COALESCE(SUM(withdrawn_cents),0) AS total_withdrawn
      FROM users
    `).get();
    return json(response, {
      success: true,
      stats: {
        totalUsers: totals.total_users,
        totalBalance: totals.total_balance / 100,
        totalDeposit: totals.total_deposit / 100,
        totalWithdrawn: totals.total_withdrawn / 100,
        pendingWithdrawals: withdrawals.filter(item => item.status === 'PENDING').length,
        pendingDeposits: deposits.filter(item => item.status === 'PENDING').length,
        pendingTasks: claims.filter(item => item.status === 'PENDING').length
      },
      users: users.map(publicUser),
      withdrawals,
      deposits,
      taskClaims: claims
    });
  }

  const approvalMatch = url.pathname.match(/^\/api\/admin\/(deposits|withdrawals|task-claims)\/([^/]+)\/(approve|reject)$/);
  if (approvalMatch && request.method === 'POST') {
    const [, resource, externalId, action] = approvalMatch;
    const approved = action === 'approve';

    if (resource === 'deposits') {
      const deposit = db.prepare('SELECT * FROM deposits WHERE txid=?').get(externalId);
      if (!deposit || deposit.status !== 'PENDING') return json(response, { error: 'Depósito não pendente' }, 409);
      transaction(() => {
        db.prepare("UPDATE deposits SET status=?,paid_at=datetime('now') WHERE txid=?")
          .run(approved ? 'PAID' : 'REJECTED', externalId);
        if (approved) {
          db.prepare('UPDATE users SET balance_cents=balance_cents+?,deposit_cents=deposit_cents+? WHERE id=?')
            .run(deposit.amount_cents, deposit.amount_cents, deposit.user_id);
          insertTransaction(deposit.user_id, 'deposit', deposit.amount_cents, 'Depósito PIX confirmado', externalId);
        }
      });
      return json(response, { success: true });
    }

    if (resource === 'task-claims') {
      const claim = db.prepare('SELECT * FROM task_claims WHERE id=?').get(externalId);
      if (!claim || claim.status !== 'PENDING') return json(response, { error: 'Tarefa não pendente' }, 409);
      const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(claim.task_id);
      transaction(() => {
        db.prepare("UPDATE task_claims SET status=?,processed_at=datetime('now') WHERE id=?")
          .run(approved ? 'APPROVED' : 'REJECTED', externalId);
        if (approved) {
          db.prepare('UPDATE users SET balance_cents=balance_cents+? WHERE id=?')
            .run(task.reward_cents, claim.user_id);
          insertTransaction(claim.user_id, 'task_reward', task.reward_cents, `Tarefa aprovada: ${task.title}`, externalId);
        }
      });
      return json(response, { success: true });
    }

    const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id=?').get(externalId);
    if (!withdrawal || withdrawal.status !== 'PENDING') return json(response, { error: 'Saque não pendente' }, 409);

    if (approved) {
      const gatewayUrl = process.env.GATEWAY_URL;
      const gatewayToken = process.env.GATEWAY_ADMIN_TOKEN;
      if (!gatewayUrl || !gatewayToken) {
        return json(response, { error: 'Gateway de pagamento não configurado' }, 503);
      }
      const payoutResponse = await fetch(`${gatewayUrl}/api/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': gatewayToken },
        body: JSON.stringify({
          amount: withdrawal.amount_cents / 100,
          pixKey: withdrawal.pix_key,
          description: `GameVault ${withdrawal.id}`
        })
      });
      const payout = await payoutResponse.json().catch(() => ({}));
      if (!payoutResponse.ok || !payout.success) {
        transaction(() => {
          db.prepare("UPDATE withdrawals SET status='FAILED',processed_at=datetime('now'),error_json=? WHERE id=?")
            .run(JSON.stringify(payout), externalId);
          db.prepare('UPDATE users SET balance_cents=balance_cents+?,withdrawn_cents=withdrawn_cents-? WHERE id=?')
            .run(withdrawal.amount_cents, withdrawal.amount_cents, withdrawal.user_id);
          insertTransaction(withdrawal.user_id, 'refund', withdrawal.amount_cents, 'Saque falhou: valor devolvido', `${externalId}:refund`);
        });
        return json(response, { success: false, error: 'Cashout falhou', provider_response: payout }, payoutResponse.status || 502);
      }
      transaction(() => {
        db.prepare("UPDATE withdrawals SET status='APPROVED',provider='LofiPay',provider_id=?,provider_response_json=?,processed_at=datetime('now') WHERE id=?")
          .run(payout.provider_id || null, JSON.stringify(payout.provider_response || {}), externalId);
      });
      return json(response, { success: true, paidExternally: true, provider_response: payout });
    }

    transaction(() => {
      db.prepare("UPDATE withdrawals SET status=?,processed_at=datetime('now') WHERE id=?")
        .run(approved ? 'APPROVED' : 'REJECTED', externalId);
      if (!approved) {
        db.prepare('UPDATE users SET balance_cents=balance_cents+?,withdrawn_cents=withdrawn_cents-? WHERE id=?')
          .run(withdrawal.amount_cents, withdrawal.amount_cents, withdrawal.user_id);
        insertTransaction(withdrawal.user_id, 'refund', withdrawal.amount_cents, 'Saque rejeitado', `${externalId}:refund`);
      }
    });
    return json(response, { success: true, paidExternally: approved });
  }

  return json(response, { error: 'Not found' }, 404);
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Token'
    });
    return response.end();
  }

  const url = new URL(request.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      return await handleApi(request, response, url);
    } catch (error) {
      console.error(error);
      return json(response, { error: 'Erro interno' }, 500);
    }
  }

  const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.join(__dirname, '..', relativePath);
  if (filePath.startsWith(path.join(__dirname, '..')) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
    response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain; charset=utf-8' });
    return fs.createReadStream(filePath).pipe(response);
  }
  json(response, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`GameVault API: http://localhost:${PORT}`);
  console.log(`Database: ${require('./database').DB_PATH}`);
});

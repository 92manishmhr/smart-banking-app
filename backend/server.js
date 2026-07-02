// Smart AI Bank — REST API backend.
// Training demo only: fake data, simplified auth, no production hardening.
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { QUESTIONS, renderReply } = require('./chatReplies');

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

// Express 4 does not forward rejected promises to the error handler,
// so every async route is wrapped with this helper.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---- Demo auth ----
// Login returns a token that is just base64("<userId>:<username>").
// Every request looks the user up again in the database. This is NOT real
// security — it is the simplest thing that lets the frontend demo roles.

function makeToken(user) {
  return Buffer.from(`${user.id}:${user.username}`).toString('base64');
}

const auth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const [id] = Buffer.from(token, 'base64').toString().split(':');
  const { rows } = await pool.query(
    'SELECT id, username, full_name, role FROM users WHERE id = $1',
    [Number(id) || 0]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid token' });

  req.user = rows[0];
  next();
});

function managerOnly(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager role required' });
  }
  next();
}

// Fetch the customer's single account, or null for users without one.
async function getAccount(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM accounts WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

// ---- Routes ----

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.post('/api/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const { rows } = await pool.query(
    'SELECT id, username, full_name, role FROM users WHERE username = $1 AND password = $2',
    [username || '', password || '']
  );
  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const user = rows[0];
  res.json({ token: makeToken(user), user });
}));

app.get('/api/me', auth, (req, res) => {
  res.json(req.user);
});

app.get('/api/account', auth, wrap(async (req, res) => {
  const account = await getAccount(req.user.id);
  if (!account) return res.status(404).json({ error: 'No account found' });
  res.json(account);
}));

app.get('/api/balance', auth, wrap(async (req, res) => {
  const account = await getAccount(req.user.id);
  if (!account) return res.status(404).json({ error: 'No account found' });
  res.json({
    account_number: account.account_number,
    balance: account.balance,
    currency: 'NPR',
  });
}));

app.get('/api/statement', auth, wrap(async (req, res) => {
  const account = await getAccount(req.user.id);
  if (!account) return res.status(404).json({ error: 'No account found' });
  const { rows } = await pool.query(
    `SELECT txn_date, description, type, amount, balance_after
     FROM transactions WHERE account_id = $1 ORDER BY txn_date, id`,
    [account.id]
  );
  res.json({ account_number: account.account_number, transactions: rows });
}));

app.get('/api/kyc', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM kyc_details WHERE user_id = $1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'No KYC record found' });
  res.json(rows[0]);
}));

// ---- Chatbox "AI" (canned questions, pre-generated replies) ----

app.get('/api/chat/questions', auth, (req, res) => {
  res.json(QUESTIONS.map(({ id, question }) => ({ id, question })));
});

app.post('/api/chat', auth, wrap(async (req, res) => {
  const { questionId } = req.body || {};
  const account = await getAccount(req.user.id);
  if (!account) return res.status(404).json({ error: 'No account found' });

  const { rows: transactions } = await pool.query(
    'SELECT description, type, amount FROM transactions WHERE account_id = $1',
    [account.id]
  );
  const reply = renderReply(questionId, req.user, account, transactions);
  if (!reply) return res.status(400).json({ error: 'Unknown question' });
  res.json({ reply });
}));

// ---- Manager views ----

app.get('/api/manager/customers', auth, managerOnly, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username,
            a.account_number, a.account_type, a.branch, a.balance,
            k.verified_at AS kyc_verified_at
     FROM users u
     JOIN accounts a ON a.user_id = u.id
     LEFT JOIN kyc_details k ON k.user_id = u.id
     WHERE u.role = 'guest'
     ORDER BY u.full_name`
  );
  res.json(rows);
}));

app.get('/api/manager/summary', auth, managerOnly, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT a.user_id)::int AS customers,
            COALESCE(SUM(a.balance), 0)    AS total_deposits,
            (SELECT COUNT(*)::int FROM transactions) AS transactions
     FROM accounts a`
  );
  res.json({ ...rows[0], currency: 'NPR' });
}));

// ---- Error handling ----

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Smart AI Bank backend listening on port ${PORT}`);
});

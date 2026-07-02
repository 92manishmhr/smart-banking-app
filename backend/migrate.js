// Database migration + seed data for Smart AI Bank.
//
// Run MANUALLY from the backend pod (or container):
//   npm run migration
//
// It drops and recreates all tables, then seeds fake demo data.
// Safe to run repeatedly — every run gives you a fresh, known state.
const pool = require('./db');

const SCHEMA = `
  DROP TABLE IF EXISTS transactions CASCADE;
  DROP TABLE IF EXISTS kyc_details CASCADE;
  DROP TABLE IF EXISTS accounts CASCADE;
  DROP TABLE IF EXISTS users CASCADE;

  CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    -- Plain-text password: acceptable ONLY because this is a training demo
    -- with fake data. Never do this in a real application.
    password   TEXT NOT NULL,
    full_name  TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('guest', 'manager'))
  );

  CREATE TABLE accounts (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    account_number TEXT UNIQUE NOT NULL,
    account_type   TEXT NOT NULL,
    branch         TEXT NOT NULL,
    opened_at      DATE NOT NULL,
    balance        NUMERIC(14, 2) NOT NULL
  );

  CREATE TABLE kyc_details (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER UNIQUE NOT NULL REFERENCES users(id),
    date_of_birth      DATE NOT NULL,
    citizenship_number TEXT NOT NULL,
    pan_number         TEXT NOT NULL,
    address            TEXT NOT NULL,
    phone              TEXT NOT NULL,
    occupation         TEXT NOT NULL,
    verified_at        DATE NOT NULL
  );

  CREATE TABLE transactions (
    id          SERIAL PRIMARY KEY,
    account_id  INTEGER NOT NULL REFERENCES accounts(id),
    txn_date    DATE NOT NULL,
    description TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount      NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL
  );
`;

// ---- Fake seed data (all names, numbers and amounts are made up) ----

const USERS = [
  { username: 'ram',     password: 'customer123', fullName: 'Ram Shrestha',   role: 'guest' },
  { username: 'sita',    password: 'customer123', fullName: 'Sita Gurung',    role: 'guest' },
  { username: 'hari',    password: 'customer123', fullName: 'Hari Thapa',     role: 'guest' },
  { username: 'manager', password: 'manager123',  fullName: 'Anita Karki',    role: 'manager' },
];

const ACCOUNTS = {
  ram:  { number: '0057012345678901', type: 'Savings', branch: 'Kathmandu, New Baneshwor', opened: '2019-04-15' },
  sita: { number: '0057023456789012', type: 'Savings', branch: 'Pokhara, Lakeside',        opened: '2021-09-02' },
  hari: { number: '0057034567890123', type: 'Current', branch: 'Lalitpur, Pulchowk',       opened: '2018-01-20' },
};

const KYC = {
  ram: {
    dob: '1988-03-12', citizenship: '27-01-75-01234', pan: '601234567',
    address: 'Shantinagar-34, Kathmandu', phone: '+977-9841000001',
    occupation: 'Software Engineer', verified: '2019-04-15',
  },
  sita: {
    dob: '1993-11-05', citizenship: '43-02-76-05678', pan: '602345678',
    address: 'Lakeside-6, Pokhara', phone: '+977-9856000002',
    occupation: 'Teacher', verified: '2021-09-02',
  },
  hari: {
    dob: '1979-07-22', citizenship: '25-03-70-09876', pan: '603456789',
    address: 'Kupondole-10, Lalitpur', phone: '+977-9803000003',
    occupation: 'Business Owner', verified: '2018-01-20',
  },
};

// June 2026 statement for each customer. Opening balance is chosen so the
// running balance works out to a tidy closing figure.
const TRANSACTIONS = {
  ram: {
    opening: 210500,
    entries: [
      ['2026-06-01', 'Salary - Himal Tech Pvt. Ltd.',        'credit', 95000],
      ['2026-06-02', 'Bhatbhateni Supermarket - Groceries',  'debit',   7250],
      ['2026-06-05', 'Nepal Electricity Authority - Bill',   'debit',   2150],
      ['2026-06-07', 'ATM Withdrawal - New Baneshwor',       'debit',  10000],
      ['2026-06-10', 'Ncell Topup',                          'debit',    500],
      ['2026-06-12', 'Salesberry - Groceries',               'debit',   4300],
      ['2026-06-15', 'Remittance Received - IME',            'credit', 25000],
      ['2026-06-18', 'Worldlink Internet - Monthly',         'debit',   1600],
      ['2026-06-21', 'Bhatbhateni Supermarket - Groceries',  'debit',   6800],
      ['2026-06-25', 'Restaurant - Roadhouse Cafe',          'debit',   3450],
      ['2026-06-28', 'Fund Transfer to Fixed Deposit',       'debit',  50000],
    ],
  },
  sita: {
    opening: 88200,
    entries: [
      ['2026-06-01', 'Salary - Shree Secondary School',      'credit', 48000],
      ['2026-06-03', 'Salesberry - Groceries',               'debit',   5100],
      ['2026-06-06', 'Nepal Telecom - Mobile Bill',          'debit',    800],
      ['2026-06-09', 'ATM Withdrawal - Lakeside',            'debit',   8000],
      ['2026-06-14', 'Bhatbhateni Supermarket - Groceries',  'debit',   3900],
      ['2026-06-17', 'Pharmacy - Fishtail Medico',           'debit',   1250],
      ['2026-06-22', 'Nepal Electricity Authority - Bill',   'debit',   1850],
      ['2026-06-26', 'Restaurant - Moondance Pokhara',       'debit',   2700],
    ],
  },
  hari: {
    opening: 512000,
    entries: [
      ['2026-06-02', 'Customer Payment - Thapa Traders',     'credit', 145000],
      ['2026-06-04', 'Supplier Payment - Birgunj Wholesale', 'debit',   98000],
      ['2026-06-08', 'Bhatbhateni Supermarket - Groceries',  'debit',    9200],
      ['2026-06-11', 'Staff Salary Transfer',                'debit',   60000],
      ['2026-06-13', 'Customer Payment - Everest Retail',    'credit',  87500],
      ['2026-06-16', 'Nepal Electricity Authority - Bill',   'debit',    5400],
      ['2026-06-20', 'Fuel - Sajha Petrol Pump',             'debit',    6500],
      ['2026-06-24', 'ATM Withdrawal - Pulchowk',            'debit',   20000],
      ['2026-06-27', 'Salesberry - Groceries',               'debit',    4800],
    ],
  },
};

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating schema…');
    await client.query('BEGIN');
    await client.query(SCHEMA);

    console.log('Seeding users, accounts, KYC and transactions…');
    for (const u of USERS) {
      const { rows } = await client.query(
        'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.username, u.password, u.fullName, u.role]
      );
      const userId = rows[0].id;

      // The manager has no customer account/KYC/transactions of their own.
      if (u.role !== 'guest') continue;

      const acc = ACCOUNTS[u.username];
      const txns = TRANSACTIONS[u.username];

      // Closing balance = opening + all credits - all debits.
      const closing = txns.entries.reduce(
        (bal, [, , type, amount]) => (type === 'credit' ? bal + amount : bal - amount),
        txns.opening
      );

      const { rows: accRows } = await client.query(
        `INSERT INTO accounts (user_id, account_number, account_type, branch, opened_at, balance)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, acc.number, acc.type, acc.branch, acc.opened, closing]
      );
      const accountId = accRows[0].id;

      const kyc = KYC[u.username];
      await client.query(
        `INSERT INTO kyc_details
           (user_id, date_of_birth, citizenship_number, pan_number, address, phone, occupation, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, kyc.dob, kyc.citizenship, kyc.pan, kyc.address, kyc.phone, kyc.occupation, kyc.verified]
      );

      let running = txns.opening;
      for (const [date, description, type, amount] of txns.entries) {
        running = type === 'credit' ? running + amount : running - amount;
        await client.query(
          `INSERT INTO transactions (account_id, txn_date, description, type, amount, balance_after)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [accountId, date, description, type, amount, running]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete. Demo users:');
    for (const u of USERS) {
      console.log(`   ${u.username} / ${u.password}  (${u.role})`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});

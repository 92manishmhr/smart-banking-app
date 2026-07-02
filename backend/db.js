// Database connection pool.
// All configuration comes from environment variables. On OpenShift these
// are sourced from a Secret (see the root README for the exact manifest).
const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date
// objects, which get shifted by the server's timezone in JSON output.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'smartaibank',
  user: process.env.DB_USER || 'bankuser',
  password: process.env.DB_PASSWORD || 'bankpass',
});

module.exports = pool;

// const { createClient } = require('@supabase/supabase-js');

// if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
//   console.error(' SUPABASE_SERVICE_ROLE_KEY is missing from .env');
//   process.exit(1);
// }

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY, // service_role
//   { auth: { persistSession: false, autoRefreshToken: false } }
// );

// module.exports = { supabase };

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// A quick test to verify the connection on startup
pool.connect()
  .then(client => {
    console.log('Successfully connected to the PostgreSQL database!');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error:', err.stack);
  });

module.exports = pool;
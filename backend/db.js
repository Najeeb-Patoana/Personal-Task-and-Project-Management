const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(' SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service_role
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = { supabase };

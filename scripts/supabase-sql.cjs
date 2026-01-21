#!/usr/bin/env node
/**
 * Execute SQL against Supabase using the Management API
 *
 * Usage:
 *   node scripts/supabase-sql.cjs "SELECT * FROM players LIMIT 1"
 *   node scripts/supabase-sql.cjs --file ./supabase/migrations/033_fix_trial_prospects_rls.sql
 *
 * Requires SUPABASE_ACCESS_TOKEN environment variable
 * (This is already set in your shell from `supabase login`)
 */

const https = require('https');
const fs = require('fs');

const PROJECT_REF = 'umblyhwumtadlvgccdwg';

async function executeSQL(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (!token) {
    console.error('Error: SUPABASE_ACCESS_TOKEN not set');
    console.error('Run: supabase login');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/supabase-sql.cjs "SELECT * FROM players LIMIT 1"');
    console.log('  node scripts/supabase-sql.cjs --file ./path/to/file.sql');
    process.exit(1);
  }

  let sql;

  if (args[0] === '--file' && args[1]) {
    sql = fs.readFileSync(args[1], 'utf-8');
  } else {
    sql = args.join(' ');
  }

  console.log('Executing SQL...');
  console.log('---');

  try {
    const result = await executeSQL(sql);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

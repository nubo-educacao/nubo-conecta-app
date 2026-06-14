import pg from 'pg';
const { Client } = pg;

const connectionString = "postgres://postgres.yfgciamhzjvarwgzosto:SYK80OGPcr0C06xp@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected.');

    // Count by type and opportunity_type
    const res = await client.query(`
      SELECT type, opportunity_type, count(*)
      FROM public.v_unified_opportunities
      GROUP BY type, opportunity_type;
    `);
    console.log('v_unified_opportunities types:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();

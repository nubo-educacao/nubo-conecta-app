import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: rawOpps } = await supabase
    .from('v_unified_opportunities')
    .select('unified_id, title, type, is_partner, status')
    .limit(50);

  console.log(`Fetched ${rawOpps?.length} opportunities from v_unified_opportunities.`);

  const mecOpps = rawOpps?.filter(o => !o.is_partner) || [];
  console.log(`MEC opportunities count: ${mecOpps.length}`);

  const courseIds = mecOpps.map(opp => opp.unified_id.replace('mec_', ''));
  const { data: courseCycles } = await supabase
    .from('opportunities')
    .select('course_id, year, semester, opportunity_type')
    .in('course_id', courseIds);

  console.log(`Fetched ${courseCycles?.length} cycle details for these MEC opportunities.`);

  const latestCycleMap = new Map<string, { year: number; semester: string; type: string }>();
  if (courseCycles) {
    for (const row of courseCycles) {
      const existing = latestCycleMap.get(row.course_id);
      const currentYear = row.year;
      const currentSem = row.semester || '1';
      if (!existing || currentYear > existing.year || (currentYear === existing.year && currentSem > existing.semester)) {
        latestCycleMap.set(row.course_id, { year: currentYear, semester: currentSem, type: row.opportunity_type });
      }
    }
  }

  const { data: programs } = await supabase
    .from('programs')
    .select('type, cycle_year, cycle_semester, status, redirect_url');

  console.log("All Programs in DB:", programs);

  const programMap = new Map<string, any>();
  if (programs) {
    for (const prog of programs) {
      const key = `${prog.type}|${prog.cycle_year}|${prog.cycle_semester}`;
      programMap.set(key, prog);
    }
  }

  const results = mecOpps.map(opp => {
    const cid = opp.unified_id.replace('mec_', '');
    const cycle = latestCycleMap.get(cid);
    let matchedProgram = null;
    let enrichedStatus = null;
    if (cycle) {
      const key = `${cycle.type}|${cycle.year}|${cycle.semester}`;
      matchedProgram = programMap.get(key) || null;
      enrichedStatus = matchedProgram?.status || 'approved';
    }
    return {
      id: opp.unified_id,
      title: opp.title,
      type: opp.type,
      cycle: cycle ? `${cycle.type} ${cycle.year}.${cycle.semester}` : 'none',
      matchedProgramKey: cycle ? `${cycle.type}|${cycle.year}|${cycle.semester}` : 'none',
      hasProgramInDb: !!matchedProgram,
      programStatus: matchedProgram?.status || null,
      enrichedStatus: enrichedStatus
    };
  });

  console.log("MEC Opportunities Enrichment Summary:");
  console.table(results.slice(0, 15));
}

main();

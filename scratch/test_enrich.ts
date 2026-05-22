import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key length:", supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Fetch Sisu opportunities
  const { data: rawOpps, error } = await supabase
    .from('v_unified_opportunities')
    .select('unified_id, title, provider_name, type, is_partner, status, category, badges, created_at, external_redirect_url, external_redirect_enabled')
    .eq('type', 'sisu')
    .limit(5);

  if (error) {
    console.error("Error fetching opportunities:", error);
    return;
  }

  console.log("Found", rawOpps.length, "Sisu opportunities from view.");
  console.log("Raw Sisu opportunities status from view:", rawOpps.map(o => ({ id: o.unified_id, status: o.status })));

  const mapped = rawOpps.map(row => ({
    id:               row.unified_id,
    title:            row.title,
    institution_name: row.provider_name,
    is_partner:       row.is_partner,
    type:             row.type,
    opportunity_type: row.type,
    category:         row.category,
    category_label:   row.category,
    location:         'Nacional',
    education_level:  'Graduação',
    badges:           row.badges || [],
    created_at:       row.created_at,
    status:           row.status,
    external_redirect: row.external_redirect_url ? { enabled: row.external_redirect_enabled, url: row.external_redirect_url } : undefined,
  }));

  const courseIds = mapped.map(opp => opp.id.replace('mec_', ''));
  console.log("Course IDs extracted:", courseIds);

  const { data: courseCycles, error: cycleError } = await supabase
    .from('opportunities')
    .select('course_id, year, semester, opportunity_type')
    .in('course_id', courseIds);

  if (cycleError) {
    console.error("Error fetching course cycles:", cycleError);
    return;
  }

  console.log("Fetched", courseCycles?.length, "course cycles from opportunities table.");

  if (courseCycles && courseCycles.length > 0) {
    const latestCycleMap = new Map<string, { year: number; semester: string; type: string }>();
    for (const row of courseCycles) {
      const existing = latestCycleMap.get(row.course_id);
      const currentYear = row.year;
      const currentSem = row.semester || '1';
      if (!existing || currentYear > existing.year || (currentYear === existing.year && currentSem > existing.semester)) {
        latestCycleMap.set(row.course_id, { year: currentYear, semester: currentSem, type: row.opportunity_type });
      }
    }

    console.log("latestCycleMap entries:", Array.from(latestCycleMap.entries()));

    const { data: programs, error: progError } = await supabase
      .from('programs')
      .select('type, cycle_year, cycle_semester, status, redirect_url');

    if (progError) {
      console.error("Error fetching programs:", progError);
      return;
    }

    console.log("Programs table content:", programs);

    if (programs && programs.length > 0) {
      const programMap = new Map<string, { status: string; redirect_url: string | null }>();
      for (const prog of programs) {
        const key = `${prog.type}|${prog.cycle_year}|${prog.cycle_semester}`;
        programMap.set(key, { status: prog.status, redirect_url: prog.redirect_url });
      }
      console.log("programMap keys:", Array.from(programMap.keys()));

      mapped.forEach(opp => {
        const cid = opp.id.replace('mec_', '');
        const cycle = latestCycleMap.get(cid);
        if (cycle) {
          const pKey = `${cycle.type}|${cycle.year}|${cycle.semester}`;
          const prog = programMap.get(pKey);
          console.log(`Mapping opp ${opp.id}: cycle key = ${pKey}, program found = ${!!prog}`);
          if (prog) {
            opp.status = prog.status;
            if (prog.redirect_url) {
              opp.external_redirect = {
                enabled: true,
                url: prog.redirect_url
              };
            }
          }
        } else {
          console.log(`No cycle found in latestCycleMap for course_id ${cid}`);
        }
      });
    }
  }

  console.log("Enriched Sisu opportunities status:", mapped.map(o => ({ id: o.id, status: o.status, redirect: o.external_redirect })));
}

main();

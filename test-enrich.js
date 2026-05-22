const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yfgciamhzjvarwgzosto.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function enrichMecOpportunities(opportunities) {
  const mecOpps = opportunities.filter(opp => !opp.is_partner);
  if (mecOpps.length === 0) return opportunities;

  const courseIds = mecOpps.map(opp => opp.unified_id.replace('mec_', ''));
  console.log('Course IDs to fetch:', courseIds);

  const { data: courseCycles, error: err1 } = await supabase
    .from('opportunities')
    .select('course_id, year, semester, opportunity_type')
    .in('course_id', courseIds);

  if (err1) {
    console.error('Error fetching course cycles:', err1);
    return opportunities;
  }

  console.log('Fetched course cycles count:', courseCycles ? courseCycles.length : 0);

  const latestCycleMap = new Map();
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

  console.log('latestCycleMap size:', latestCycleMap.size);
  if (latestCycleMap.size > 0) {
    console.log('Example cycle mapping for', Array.from(latestCycleMap.keys())[0], ':', latestCycleMap.get(Array.from(latestCycleMap.keys())[0]));
  }

  const { data: programs, error: err2 } = await supabase
    .from('programs')
    .select('type, cycle_year, cycle_semester, status, redirect_url');

  if (err2) {
    console.error('Error fetching programs:', err2);
    return opportunities;
  }

  console.log('Programs:', programs);

  if (programs && programs.length > 0) {
    const programMap = new Map();
    for (const prog of programs) {
      const key = `${prog.type.toLowerCase()}|${prog.cycle_year}|${prog.cycle_semester}`;
      programMap.set(key, prog);
    }

    opportunities.forEach(opp => {
      if (!opp.is_partner) {
        const cid = opp.unified_id.replace('mec_', '');
        const cycle = latestCycleMap.get(cid);
        if (cycle) {
          const key = `${cycle.type.toLowerCase()}|${cycle.year}|${cycle.semester}`;
          const prog = programMap.get(key);
          console.log(`Matching opp ${opp.unified_id}: cycle is ${key}, prog found:`, !!prog);
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
          console.log(`No cycle found in latestCycleMap for opp ${opp.unified_id}`);
        }
      }
    });
  }

  return opportunities;
}

async function main() {
  const { data: opportunities, error } = await supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('is_partner', false)
    .limit(5);

  if (error) {
    console.error('Error fetching unified opportunities:', error);
    return;
  }

  console.log('Fetched opportunities:', opportunities.map(o => ({ id: o.unified_id, title: o.title })));
  const enriched = await enrichMecOpportunities(opportunities);
  console.log('Enriched statuses:', enriched.map(o => ({ id: o.unified_id, status: o.status, external_redirect: o.external_redirect })));
}

main();

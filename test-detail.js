const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yfgciamhzjvarwgzosto.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getOpportunity(unifiedId) {
  let query = supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('unified_id', unifiedId);

  const { data: oppData, error: oppError } = await query.single();

  if (oppError || !oppData) {
    console.error('Opportunity not found or query error:', oppError);
    return null;
  }

  console.log('Found opp in view:', { unified_id: oppData.unified_id, type: oppData.type, status: oppData.status });

  let programType = oppData.type;
  let latestOpportunity = null;

  if (unifiedId.startsWith('mec_')) {
    const courseId = unifiedId.replace('mec_', '');
    const { data, error } = await supabase
      .from('opportunities')
      .select('opportunity_type, year, semester')
      .eq('course_id', courseId)
      .order('year', { ascending: false })
      .order('semester', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest opportunity:', error);
    }
    if (data) {
      latestOpportunity = data;
      programType = data.opportunity_type;
    }
  }

  console.log('Latest opportunity in DB:', latestOpportunity);

  let programQuery = supabase
    .from('programs')
    .select('status, redirect_url')
    .eq('type', programType);

  if (latestOpportunity && latestOpportunity.year) {
    programQuery = programQuery
      .eq('cycle_year', latestOpportunity.year)
      .eq('cycle_semester', latestOpportunity.semester || '1');
  } else {
    programQuery = programQuery
      .order('cycle_year', { ascending: false })
      .order('cycle_semester', { ascending: false })
      .limit(1);
  }

  const { data: programData, error: progError } = await programQuery.maybeSingle();
  if (progError) {
    console.error('Error querying program:', progError);
  }

  console.log('Program queried:', programData);

  if (programData) {
    oppData.status = programData.status;
    oppData.external_redirect_url = programData.redirect_url;
    oppData.external_redirect_enabled = !!programData.redirect_url;
  }

  return oppData;
}

async function main() {
  const unifiedId = 'mec_00339d4a-0071-406e-9943-fba7bec27ef6';
  const res = await getOpportunity(unifiedId);
  console.log('Result status:', res ? res.status : null);
  console.log('Result external_redirect_url:', res ? res.external_redirect_url : null);
}

main();

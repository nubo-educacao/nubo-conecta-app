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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDetail(unifiedId: string) {
  console.log("Testing detail fetch for:", unifiedId);
  const { data: oppData, error: oppError } = await supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('unified_id', unifiedId)
    .single();

  if (oppError || !oppData) {
    console.error("Error fetching opportunity from view:", oppError);
    return;
  }

  console.log("Raw opportunity from view type:", oppData.type, "status:", oppData.status);

  let year = 2026;
  let semester = '1';
  let programType = oppData.type;
  
  if (unifiedId.startsWith('mec_')) {
    const courseId = unifiedId.replace('mec_', '');
    const { data: latestOpportunity } = await supabase
      .from('opportunities')
      .select('year, semester, opportunity_type')
      .eq('course_id', courseId)
      .order('year', { ascending: false })
      .order('semester', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestOpportunity) {
      year = latestOpportunity.year;
      semester = latestOpportunity.semester;
      programType = latestOpportunity.opportunity_type;
      console.log("Found latest opportunity:", latestOpportunity);
    } else {
      console.log("Latest opportunity not found for course_id:", courseId);
    }
  }

  const { data: programData, error: progError } = await supabase
    .from('programs')
    .select('status, redirect_url')
    .eq('type', programType)
    .eq('cycle_year', year)
    .eq('cycle_semester', semester)
    .maybeSingle();

  if (progError) {
    console.error("Error querying programs table:", progError);
  }

  if (programData) {
    console.log("Program data found in database:", programData);
    oppData.status = programData.status;
    oppData.external_redirect_url = programData.redirect_url;
    oppData.external_redirect_enabled = !!programData.redirect_url;
  } else {
    console.log("No program matches type:", programType, "year:", year, "semester:", semester);
  }

  const result = {
    id:               oppData.unified_id,
    title:            oppData.title,
    is_partner:       oppData.is_partner,
    status:           oppData.status,
    external_redirect: oppData.external_redirect_url
      ? { enabled: oppData.external_redirect_enabled, url: oppData.external_redirect_url }
      : undefined,
  };
  console.log("Final hydrated opportunity detail:", result);
}

testDetail('mec_00339d4a-0071-406e-9943-fba7bec27ef6');

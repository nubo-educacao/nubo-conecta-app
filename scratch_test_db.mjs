import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfgciamhzjvarwgzosto.supabase.co';
const supabaseKey = 'sb_publishable_OTHxmEItZ1qVThDs-IbJHQ_sqzSR_ns';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('student_applications')
    .select(`
        id, partner_id, status, created_at, updated_at, eligibility_score,
        partner_opportunities:partner_id (
          name,
          institutions:institution_id (
            name,
            partner_institutions ( logo_url )
          )
        )
      `)
    .limit(5);
    
  console.log("With partner_id:", JSON.stringify({ data, error }, null, 2));

  const { data: data2, error: error2 } = await supabase
    .from('student_applications')
    .select(`*`)
    .limit(5);

  console.log("Raw student_applications:", JSON.stringify({ data: data2, error: error2 }, null, 2));
}

main();

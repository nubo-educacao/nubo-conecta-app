const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yfgciamhzjvarwgzosto.supabase.co';
const supabaseKey = 'sb_publishable_OTHxmEItZ1qVThDs-IbJHQ_sqzSR_ns'; // Anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- DB SUMMARY ---');
  
  const { count: appsCount } = await supabase
    .from('student_applications')
    .select('*', { count: 'exact', head: true });
  console.log('student_applications count:', appsCount);

  const { count: profilesCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });
  console.log('user_profiles count:', profilesCount);

  const { count: stepsCount } = await supabase
    .from('partner_steps')
    .select('*', { count: 'exact', head: true });
  console.log('partner_steps count:', stepsCount);

  const { count: formsCount } = await supabase
    .from('partner_forms')
    .select('*', { count: 'exact', head: true });
  console.log('partner_forms count:', formsCount);

  console.log('\n--- ALL PROFILES ---');
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*');
  profiles?.forEach(p => {
    console.log(`Profile ID: ${p.id}, Name: ${p.full_name}, Is Dependent: ${p.isdependent}, parent_user_id: ${p.parent_user_id}`);
    console.log(`Fields:`, { full_name: p.full_name, email: p.email, cpf: p.cpf, phone: p.phone });
  });

  console.log('\n--- ALL APPLICATIONS ---');
  const { data: apps } = await supabase
    .from('student_applications')
    .select('*')
    .order('updated_at', { ascending: false });
  apps?.forEach(app => {
    console.log(`App ID: ${app.id}, Status: ${app.status}, User ID: ${app.user_id}, Partner ID: ${app.partner_id}`);
    console.log('Answers:', JSON.stringify(app.answers, null, 2));
  });
}

main();

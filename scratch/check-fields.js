const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yfgciamhzjvarwgzosto.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- PARTNER FORMS FIELDS ---');
  const { data: fields, error } = await supabase
    .from('partner_forms')
    .select('id, field_name, question_text, mapping_source, partner_id');

  if (error) {
    console.error('Error fetching fields:', error);
    return;
  }

  fields.forEach(f => {
    if (f.mapping_source) {
      console.log(`Partner ID: ${f.partner_id}, Field Name: "${f.field_name}", Question: "${f.question_text}", Mapping Source: "${f.mapping_source}"`);
    }
  });
}

main();

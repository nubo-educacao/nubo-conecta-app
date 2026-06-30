import { supabase } from '@/lib/supabase';

export async function registerPartnerClick(partnerId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Efficient way:
    // 1. Try to fetch existing row
    const { data, error: fetchError } = await supabase
        .from('partners_click')
        .select('id, clicks')
        .eq('user_id', user.id)
        .eq('partner_id', partnerId)
        .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
        console.error('Error fetching partner click:', fetchError);
        return { error: fetchError };
    }

    if (data) {
        // Update
        const { error: updateError } = await supabase
            .from('partners_click')
            .update({ clicks: data.clicks + 1 })
            .eq('id', data.id);
        
        return { error: updateError };
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('partners_click')
            .insert({
                user_id: user.id,
                partner_id: partnerId,
                clicks: 1
            });
        
        return { error: insertError };
    }

  } catch (error) {
    console.error('Unexpected error registering partner click:', error);
    return { error };
  }
}

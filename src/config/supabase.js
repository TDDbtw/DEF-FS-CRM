import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dbAPI = {
  login: async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  logout: async () => {
    return await supabase.auth.signOut();
  },

  loginWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { data, error };
  },

  getCurrentUser: async () => {
    return await supabase.auth.getUser();
  },

  fetchCustomers: async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    return { data, error };
  },

  addCustomer: async (customer) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select();
    return { data, error };
  },

  fetchFills: async () => {
    const { data, error } = await supabase
      .from('fills')
      .select('*')
      .order('ts', { ascending: false });
    return { data, error };
  },

  addFill: async (fill) => {
    const { data, error } = await supabase
      .from('fills')
      .insert([fill])
      .select();

    if (!error) {
      try {
        const { data: custExists } = await supabase
          .from('customers')
          .select('vehicle')
          .eq('vehicle', fill.vehicle.toUpperCase())
          .maybeSingle();

        if (!custExists) {
          await supabase
            .from('customers')
            .insert([{
              vehicle: fill.vehicle.toUpperCase(),
              name: fill.driver,
              phone: fill.driver_ph || '',
              company: fill.company || '',
              co_phone: fill.co_ph || '',
              state: fill.state,
              notes: 'Auto-registered during fill entry'
            }]);
        }
      } catch (e) {
        console.error('Error auto-registering customer:', e);
      }
    }
    return { data, error };
  },

  fetchShiftLogs: async () => {
    const { data, error } = await supabase
      .from('shift_logs')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  addShiftLog: async (log) => {
    const { data, error } = await supabase
      .from('shift_logs')
      .insert([log])
      .select();
    return { data, error };
  },
};

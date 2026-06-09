import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if Supabase is configured with real credentials
export const isMockMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-project') || 
  supabaseAnonKey.includes('your-anon-key') ||
  supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c'); // check default placeholder key prefix

export let supabase = null;

if (!isMockMode) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCALSTORAGE FALLBACK DB (For Mock Mode)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_DB = {
  getCustomers: () => JSON.parse(localStorage.getItem('gloe_customers') || '[]'),
  getFills: () => JSON.parse(localStorage.getItem('gloe_fills') || '[]'),
  getShiftLogs: () => JSON.parse(localStorage.getItem('gloe_shift_logs') || '[]'),
  saveCustomers: (data) => localStorage.setItem('gloe_customers', JSON.stringify(data)),
  saveFills: (data) => localStorage.setItem('gloe_fills', JSON.stringify(data)),
  saveShiftLogs: (data) => localStorage.setItem('gloe_shift_logs', JSON.stringify(data)),
};

// Seed initial mock data if empty
if (isMockMode) {
  if (MOCK_DB.getCustomers().length === 0) {
    const defaultCusts = [
      { id: 'c1', name: 'Mariyappan', phone: '9786932624', vehicle: 'TN72AB1234', company: 'MMS Transport', coPhone: '', state: 'Tamil Nadu', notes: '', createdAt: new Date(Date.now() - 86400000*20).toISOString() },
      { id: 'c2', name: 'Samvel', phone: '9361771027', vehicle: 'KL17Y8949', company: 'Bagavan Company', coPhone: '', state: 'Kerala', notes: '', createdAt: new Date(Date.now() - 86400000*30).toISOString() },
      { id: 'c3', name: 'Moses', phone: '7092917251', vehicle: 'TN59DC0823', company: 'MTR Transport', coPhone: '', state: 'Tamil Nadu', notes: '', createdAt: new Date(Date.now() - 86400000*5).toISOString() },
      { id: 'c4', name: 'Suthir', phone: '9188400225', vehicle: 'KL68A9819', company: 'Ananthapuri', coPhone: '', state: 'Kerala', notes: 'Kerala customer', createdAt: new Date(Date.now() - 86400000*60).toISOString() },
      { id: 'c5', name: 'Kumar', phone: '9626349596', vehicle: 'TN30CV5334', company: 'TMA', coPhone: '', state: 'Tamil Nadu', notes: '', createdAt: new Date(Date.now() - 86400000*45).toISOString() },
    ];
    const defaultFills = [
      { id: 'f1', ts: new Date(Date.now()-86400000*45).toISOString(), employee:'Basil', machine:'hp', vehicle:'TN72AB1234', driver:'Mariyappan', driverPh:'9786932624', company:'MMS Transport', coPh:'', odo:'', state:'Tamil Nadu', litres:25.9, actual:1685, discount:26, final:1659, payment:'Cash', shift:'Mid-shift fill', totalizers:{} },
      { id: 'f2', ts: new Date(Date.now()-86400000*30).toISOString(), employee:'Bhagavathi', machine:'cb', vehicle:'KL17Y8949', driver:'Samvel', driverPh:'9361771027', company:'Bagavan Company', coPh:'', odo:'', state:'Kerala', litres:14.8, actual:814, discount:15, final:799, payment:'Cash', shift:'Mid-shift fill', totalizers:{} },
      { id: 'f3', ts: new Date(Date.now()-86400000*3).toISOString(), employee:'Basil', machine:'cb', vehicle:'TN59DC0823', driver:'Moses', driverPh:'7092917251', company:'MTR Transport', coPh:'', odo:'', state:'Tamil Nadu', litres:40.4, actual:2222, discount:40, final:2182, payment:'GPay / UPI', shift:'Mid-shift fill', totalizers:{} },
      { id: 'f4', ts: new Date(Date.now()-86400000*2).toISOString(), employee:'Basil', machine:'hp', vehicle:'TN30CV5334', driver:'Kumar', driverPh:'9626349596', company:'TMA', coPh:'', odo:'', state:'Tamil Nadu', litres:9.09, actual:591, discount:9, final:582, payment:'Cash', shift:'Mid-shift fill', totalizers:{} },
      { id: 'f5', ts: new Date(Date.now()-3600000*2).toISOString(), employee:'Basil', machine:'cb', vehicle:'TN72AB1234', driver:'Mariyappan', driverPh:'9786932624', company:'MMS Transport', coPh:'', odo:'', state:'Tamil Nadu', litres:20, actual:1100, discount:20, final:1080, payment:'GPay / UPI', shift:'Mid-shift fill', totalizers:{} },
    ];
    MOCK_DB.saveCustomers(defaultCusts);
    MOCK_DB.saveFills(defaultFills);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA API INTERFACE (Routing to Supabase or LocalStorage)
// ─────────────────────────────────────────────────────────────────────────────

export const dbAPI = {
  // Authentication Mock
  login: async (email, password) => {
    if (isMockMode) {
      // Mock success for Basil/Bhagavathi with any credentials
      const name = email.split('@')[0];
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      return { 
        data: { 
          user: { email, id: 'mock-user-id', user_metadata: { display_name: displayName } },
          session: { access_token: 'mock-session-token' }
        }, 
        error: null 
      };
    } else {
      return await supabase.auth.signInWithPassword({ email, password });
    }
  },

  logout: async () => {
    if (isMockMode) {
      return { error: null };
    } else {
      return await supabase.auth.signOut();
    }
  },

  getCurrentUser: async () => {
    if (isMockMode) {
      const stored = localStorage.getItem('gloe_session_user');
      return { data: { user: stored ? JSON.parse(stored) : null } };
    } else {
      return await supabase.auth.getUser();
    }
  },

  // Customers Query
  fetchCustomers: async () => {
    if (isMockMode) {
      return { data: MOCK_DB.getCustomers(), error: null };
    } else {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      return { data, error };
    }
  },

  // Add Customer
  addCustomer: async (customer) => {
    if (isMockMode) {
      const list = MOCK_DB.getCustomers();
      const newCust = {
        id: 'c' + Date.now(),
        ...customer,
        created_at: new Date().toISOString(),
      };
      list.push(newCust);
      MOCK_DB.saveCustomers(list);
      return { data: [newCust], error: null };
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select();
      return { data, error };
    }
  },

  // Fetch Fills
  fetchFills: async () => {
    if (isMockMode) {
      return { data: MOCK_DB.getFills(), error: null };
    } else {
      const { data, error } = await supabase
        .from('fills')
        .select('*')
        .order('ts', { ascending: false });
      return { data, error };
    }
  },

  // Add Fill
  addFill: async (fill) => {
    if (isMockMode) {
      const list = MOCK_DB.getFills();
      const newFill = {
        id: 'f' + Date.now(),
        ...fill,
        ts: fill.ts || new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      list.push(newFill);
      MOCK_DB.saveFills(list);
      
      // Auto-register unknown customer in mock mode
      const custs = MOCK_DB.getCustomers();
      const exists = custs.some(c => c.vehicle.toUpperCase() === fill.vehicle.toUpperCase());
      if (!exists) {
        custs.push({
          id: 'c' + Date.now(),
          vehicle: fill.vehicle.toUpperCase(),
          name: fill.driver,
          phone: fill.driver_ph || '',
          company: fill.company || '',
          co_phone: fill.co_ph || '',
          state: fill.state,
          notes: '',
          created_at: new Date().toISOString()
        });
        MOCK_DB.saveCustomers(custs);
      }
      
      return { data: [newFill], error: null };
    } else {
      const { data, error } = await supabase
        .from('fills')
        .insert([fill])
        .select();
        
      // Auto-register customer in real Supabase (handled in UI or via triggers; here we do it from client side to replicate original HTML logic)
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
    }
  },

  // Shift logs (individual start/end records)
  fetchShiftLogs: async () => {
    if (isMockMode) {
      return { data: MOCK_DB.getShiftLogs(), error: null };
    } else {
      const { data, error } = await supabase
        .from('shift_logs')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    }
  },

  addShiftLog: async (log) => {
    if (isMockMode) {
      const list = MOCK_DB.getShiftLogs();
      const entry = {
        id: 'sl_' + Date.now(),
        ...log,
        created_at: new Date().toISOString(),
      };
      list.unshift(entry);
      MOCK_DB.saveShiftLogs(list);
      return { data: [entry], error: null };
    } else {
      const { data, error } = await supabase
        .from('shift_logs')
        .insert([log])
        .select();
      return { data, error };
    }
  },
};

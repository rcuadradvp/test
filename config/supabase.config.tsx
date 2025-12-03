import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Tus keys de Supabase
const SUPABASE_URL = 'https://xyksrveuozpuwjieqmtd.supabase.co'; // ← CAMBIAR
const SUPABASE_ANON_KEY = 'sb_publishable_zmktJ1skP3hTK8jK7y8NCg_wutfBgrs'; // ← CAMBIAR

// Configuración de storage
const supabaseStorage = Platform.OS === 'web' 
  ? {
      // Web usa localStorage por defecto
    }
  : {
      // Mobile usa AsyncStorage
      storage: AsyncStorage,
    };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
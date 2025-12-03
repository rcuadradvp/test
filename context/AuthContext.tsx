import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/config/supabase.config';
import { storage } from '@/services/storage/SecureStorage';
import { STORAGE_KEYS } from '@/constants/storage';
import type { User, AuthContextType } from '@/types/auth.types';

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLogged, setUserLogged] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState('');

  // Refs para evitar múltiples inicializaciones y condiciones de carrera
  const isInitializedRef = useRef(false);
  const isLoadingProfileRef = useRef(false);

  /**
   * Logout: limpia toda la sesión
   */
  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      await supabase.auth.signOut();
      await storage.removeMultiple([
        STORAGE_KEYS.SESSION_KEY,
        STORAGE_KEYS.USER_DATA_KEY,
      ]);
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUserLogged(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Cargar perfil del usuario desde Supabase
   */
  const loadUserProfile = useCallback(async (): Promise<void> => {
    // Evitar múltiples cargas simultáneas
    if (isLoadingProfileRef.current) {
      console.log('⏳ Profile already loading, skipping...');
      return;
    }

    isLoadingProfileRef.current = true;
    console.log('👤 Loading user profile...');

    try {
      // Obtener usuario
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No user found');
        setUserLogged(null);
        setIsAuthenticated(false);
        return;
      }

      // Cargar datos del perfil desde tabla profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error loading profile:', profileError);
        setError('Error al cargar el perfil del usuario');
        setUserLogged(null);
        setIsAuthenticated(false);
        await supabase.auth.signOut();
        return;
      }

      // Verificar que la empresa esté activa
      if (!profile.company_active) {
        console.log('❌ Company not active');
        setError('La empresa no se encuentra activa');
        setUserLogged(null);
        setIsAuthenticated(false);
        await supabase.auth.signOut();
        return;
      }

      const userData: User = {
        userId: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        role: profile.role || 'user',
        companyName: profile.company_name || '',
        companyActive: profile.company_active,
        paths: profile.paths || [],
        customRole: profile.custom_role,
        companyId: profile.company_id || '',
      };

      console.log('✅ Profile loaded successfully:', userData.name);
      setUserLogged(userData);
      setIsAuthenticated(true);

      // Guardar en storage (no bloqueante)
      storage.setItem(STORAGE_KEYS.SESSION_KEY, 'true').catch(console.error);
      storage.setItem(STORAGE_KEYS.USER_DATA_KEY, JSON.stringify(userData)).catch(console.error);
    } catch (err) {
      console.error('Error in loadUserProfile:', err);
      setUserLogged(null);
      setIsAuthenticated(false);
    } finally {
      isLoadingProfileRef.current = false;
    }
  }, []);

  /**
   * Login: autentica al usuario con Supabase
   */
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError('');

      try {
        console.log('🔐 Attempting login...');
        
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          console.error('Auth error:', authError.message);
          setError(authError.message === 'Invalid login credentials' 
            ? 'Usuario o contraseña incorrectas' 
            : authError.message);
          return false;
        }

        if (!data.user) {
          setError('Error al iniciar sesión');
          return false;
        }

        // Cargar perfil del usuario
        await loadUserProfile();
        return true;
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.message || 'Error al iniciar sesión');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserProfile]
  );

  /**
   * Refresh Session: verifica y refresca la sesión de Supabase
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('❌ No valid session');
        await logout();
        return false;
      }

      await loadUserProfile();
      return true;
    } catch (err) {
      console.error('Error refreshing session:', err);
      await logout();
      return false;
    }
  }, [logout, loadUserProfile]);

  /**
   * Effect: Inicialización - restaurar sesión si existe
   * Se ejecuta SOLO UNA VEZ con timeout de seguridad
   */
  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (isInitializedRef.current) {
      console.log('⚠️ Already initialized, skipping...');
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const initAuth = async () => {
      isInitializedRef.current = true;
      console.log('🚀 Initializing auth...');

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('📦 Found existing session');
          await loadUserProfile();
        } else {
          console.log('📭 No existing session');
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setUserLogged(null);
        setIsAuthenticated(false);
      } finally {
        clearTimeout(timeoutId);
        console.log('✅ Initialization complete');
        setIsInitializing(false);
      }
    };

    // Timeout de seguridad: si después de 15 segundos no termina, forzar fin
    timeoutId = setTimeout(() => {
      if (isInitializing) {
        console.warn('⚠️ Auth initialization timeout, forcing complete');
        setIsInitializing(false);
        setUserLogged(null);
        setIsAuthenticated(false);
      }
    }, 15000);

    initAuth();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Sin dependencias - se ejecuta solo al montar

  /**
   * Effect: Listener de cambios de autenticación de Supabase
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event);

        // Solo procesar si ya se inicializó
        if (!isInitializedRef.current) {
          console.log('⏳ Not initialized yet, skipping auth state change');
          return;
        }

        switch (event) {
          case 'SIGNED_IN':
            if (session && !isAuthenticated) {
              await loadUserProfile();
            }
            break;
          case 'SIGNED_OUT':
            setUserLogged(null);
            setIsAuthenticated(false);
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated, loadUserProfile]);

  /**
   * Effect: Refresh cuando la app vuelve al foreground
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    if (Platform.OS === 'web') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshSession();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshSession();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, refreshSession]);

  const clearError = useCallback(() => setError(''), []);

  const contextValue = useMemo(
    () => ({
      login,
      logout,
      loadUserProfile,
      isAuthenticated,
      userLogged,
      setUserLogged,
      setIsAuthenticated,
      isLoading,
      isInitializing,
      error,
      clearError,
      refreshSession,
    }),
    [
      login,
      logout,
      loadUserProfile,
      isAuthenticated,
      userLogged,
      isLoading,
      isInitializing,
      error,
      clearError,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within AuthContextProvider');
  }
  
  return context;
}
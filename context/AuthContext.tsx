// context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { router } from 'expo-router';
import { AuthService } from '@/services/auth';
import { BiometricService } from '@/services/biometric';
import {
  initializeTokens,
  onTokenExpired,
  getAccessToken,
  shouldRefreshToken,
} from '@/services/api';
import { isTokenExpired } from '@/utils/jwt';
import type { User, LoginCredentials } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  enableBiometric: (username: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  shouldPromptBiometric: boolean;
  clearBiometricPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [shouldPromptBiometric, setShouldPromptBiometric] = useState(true);
  const isInitialized = useRef(false);
  const appState = useRef(AppState.currentState);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const clearBiometricPrompt = useCallback(() => {
    setShouldPromptBiometric(false);
  }, []);

  const logout = useCallback(async () => {
  try {
    await AuthService.logout();
    clearAuthState();
    setShouldPromptBiometric(false);
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    clearAuthState();
    setShouldPromptBiometric(false);
  }
}, [clearAuthState]);

  const initializeBiometric = useCallback(async () => {
    const available = await BiometricService.isAvailable();
    setBiometricAvailable(available);
    if (available) {
      const type = await BiometricService.getBiometricName();
      setBiometricType(type);
      const enabled = await BiometricService.isEnabled();
      const hasCredentials = await BiometricService.hasStoredCredentials();
      setBiometricEnabled(enabled && hasCredentials);
    }
  }, []);

  const enableBiometric = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const success = await BiometricService.enable(username, password);
      if (success) {
        setBiometricEnabled(true);
      }
      return success;
    },
    []
  );

  const disableBiometric = useCallback(async () => {
    await BiometricService.disable();
    setBiometricEnabled(false);
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated) {
      return true;
    }

    setError(null);
    setShouldPromptBiometric(false);

    try {
      const credentials = await BiometricService.getCredentials();

      if (!credentials) {
        return false;
      }

      setIsLoading(true);

      const result = await AuthService.login({
        username: credentials.username,
        password: credentials.password,
      });

      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        return true;
      } else {
        setError('Credenciales inválidas. Por favor ingresa tu contraseña.');
        await BiometricService.disable();
        setBiometricEnabled(false);
        return false;
      }
    } catch (err) {
      console.error('[Auth] Biometric login error:', err);
      setError('Error de conexión');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      setShouldPromptBiometric(false);

      try {
        const result = await AuthService.login(credentials);

        if (result.success && result.user) {
          setUser(result.user);
          setIsAuthenticated(true);

          if (biometricAvailable && !biometricEnabled) {
            setTimeout(() => {
              Alert.alert(
                `Habilitar ${biometricType}`,
                `¿Deseas usar ${biometricType} para iniciar sesión más rápido?`,
                [
                  { text: 'No, gracias', style: 'cancel' },
                  {
                    text: 'Sí, habilitar',
                    onPress: () => enableBiometric(credentials.username, credentials.password),
                  },
                ]
              );
            }, 500);
          }

          return true;
        } else {
          setError(result.error || 'Error al iniciar sesión');
          return false;
        }
      } catch (err) {
        setError('Error de conexión');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [biometricAvailable, biometricEnabled, biometricType, enableBiometric]
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const hasTokens = await initializeTokens();
      if (!hasTokens) {
        await logout();
        return false;
      }

      const storedUser = await AuthService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch {
      await logout();
      return false;
    }
  }, [logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      await initializeBiometric();

      const hasSession = await AuthService.hasActiveSession();
      if (!hasSession) {
        setShouldPromptBiometric(true);
        setIsLoading(false);
        return;
      }

      const hasTokens = await initializeTokens();
      if (!hasTokens) {
        setShouldPromptBiometric(true);
        await AuthService.logout();
        setIsLoading(false);
        return;
      }

      const token = getAccessToken();
      if (token && !isTokenExpired(token)) {
        const storedUser = await AuthService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
          setShouldPromptBiometric(false);
        }
      } else {
        setShouldPromptBiometric(true);
      }
    } catch (err) {
      console.error('[AuthContext] Error initializing:', err);
      setShouldPromptBiometric(true);
    } finally {
      setIsLoading(false);
    }
  }, [initializeBiometric]);

  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (isAuthenticated && shouldRefreshToken()) {
          refreshSession();
        }
      }
      appState.current = nextAppState;
    },
    [isAuthenticated, refreshSession]
  );

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const unsubscribe = onTokenExpired(() => {
      setShouldPromptBiometric(true);
      clearAuthState();
    });
    return () => { unsubscribe(); };
  }, [clearAuthState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
  }, [handleAppStateChange]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      refreshSession,
      clearError,
      biometricAvailable,
      biometricEnabled,
      biometricType,
      enableBiometric,
      disableBiometric,
      loginWithBiometric,
      shouldPromptBiometric,
      clearBiometricPrompt,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      refreshSession,
      clearError,
      biometricAvailable,
      biometricEnabled,
      biometricType,
      enableBiometric,
      disableBiometric,
      loginWithBiometric,
      shouldPromptBiometric,
      clearBiometricPrompt,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
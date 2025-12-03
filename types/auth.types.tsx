/**
 * Types de Autenticación
 */

export type User = {
  userId: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  companyActive: boolean;
  paths: string[];
  customRole?: string;
  companyId: string;
};

export type AuthContextType = {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUserProfile: () => Promise<void>; // 🔥 AGREGADO
  isAuthenticated: boolean;
  userLogged: User | null;
  setUserLogged: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  isInitializing: boolean;
  error: string;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
};

export type LoginResponse = {
  data: {
    userId: string;
    name: string;
    email: string;
    companyId: string;
    role: string;
    companyName: string;
    companyActive: boolean;
    paths: string[];
    customRole?: string;
    token: string;
    refreshToken: string;
  };
};

export type RefreshTokenResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
  };
};

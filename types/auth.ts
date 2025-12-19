export interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
  companyActive: boolean;
  paths: string[];
  customRole?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
  companyActive: boolean;
  paths: string[];
  customRole?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmedNewPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmedNewPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

export type AuthContextType = AuthState & AuthActions;
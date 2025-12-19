
import { jwtDecode } from 'jwt-decode';

export interface JWTPayload {
  sub?: string;
  exp: number;
  iat: number;
  userId?: string;
  email?: string;
  role?: string;
}

export const decodeToken = <T = JWTPayload>(token: string): T | null => {
  try {
    return jwtDecode<T>(token);
  } catch (error) {
    console.error('[JWT] Error decoding token:', error);
    return null;
  }
};

export const getTokenExpiry = (token: string): number | null => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return null;
  return decoded.exp * 1000;
};

export const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  
  return Date.now() >= expiry;
};

export const isTokenExpiringSoon = (
  token: string,
  thresholdMs: number = 5 * 60 * 1000
): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  
  return Date.now() >= expiry - thresholdMs;
};

export const getTokenTimeRemaining = (token: string): number => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return 0;
  
  const remaining = expiry - Date.now();
  return remaining > 0 ? remaining : 0;
};

export const formatTimeRemaining = (token: string): string => {
  const remaining = getTokenTimeRemaining(token);
  
  if (remaining <= 0) return 'Expirado';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
};
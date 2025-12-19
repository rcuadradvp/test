const Environments = {
  DEVELOPMENT: 'http://localhost:3000',
  STAGING: 'http://200.63.96.137:8080',
  PRODUCTION: 'https://apisentinel.vtraxx.cl',
} as const;

export const BASE_URL = Environments.PRODUCTION;

export const ApiTimeouts = {
  DEFAULT: 30000,
  UPLOAD: 60000,
  LONG_REQUEST: 45000,
} as const;

export const DefaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

export const Endpoints = {
  AUTH: {
    LOGIN: '/token',
    REFRESH: '/refresh-token',
    REGISTER: '/account/register',
    ACTIVATE: '/account/activate',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
  },

  USERS: {
    BASE: '/users',
    BY_ID: (uuid: string) => `/users/search/${uuid}`,
    BY_COMPANY: (uuid: string) => `/users/company/${uuid}`,
    UPDATE: (uuid: string) => `/users/${uuid}`,
    CUSTOM_ROLE: (uuid: string) => `/users/${uuid}/custom-role`,
    DELETE: (uuid: string) => `/users/${uuid}`,
  },

  COMPANIES: {
    BASE: '/companies',
    BY_ID: (uuid: string) => `/companies/${uuid}`,
  },

  DEVICES: {
    BASE: '/devices',
    BY_ID: (uuid: string) => `/devices/${uuid}`,
  },

  GATEWAYS: {
    BASE: '/gateways',
    BY_ID: (uuid: string) => `/gateways/${uuid}`,
  },

  VERSION: '/version',
} as const;
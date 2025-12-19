// constants/permissions.ts

export const AppPaths = {
  // Monitoring
  MONITORING: 'MONITORING',
  
  // Devices
  DEVICES_ASSIGNED: 'DEVICES_ASSIGNED',
  DEVICES_UNASSIGNED: 'DEVICES_UNASSIGNED',
  
  // Gateway
  GATEWAY: 'GATEWAY',
  GATEWAYS_BY_ZONE: 'GATEWAYS_BY_ZONE',
  
  // Alerts
  ALERTS: 'ALERTS',
  HISTORY_ALERTS: 'HISTORY_ALERTS',
  
  // Admin
  USERS: 'USERS',
  ROLES: 'ROLES',
} as const;

export type AppPath = typeof AppPaths[keyof typeof AppPaths];

// ✅ Interface para definir permisos de tabs
interface TabPermission {
  requiredPaths: AppPath[];
  anyOf?: boolean;
  label: string;
  icon: string;
}

// Mapeo de paths a tabs de la app
export const TabPermissions: Record<string, TabPermission> = {
  scanner: {
    requiredPaths: [], // ✅ Siempre visible
    label: 'Scanner',
    icon: 'Bluetooth',
  },
  devices: {
    // Requiere al menos uno de estos
    requiredPaths: [AppPaths.DEVICES_ASSIGNED, AppPaths.DEVICES_UNASSIGNED],
    anyOf: true, // ✅ Con que tenga uno, se muestra el tab
    label: 'V-tags',
    icon: 'smartphone-nfc',
  },
  profile: {
    requiredPaths: [], // ✅ Siempre visible
    label: 'Perfil',
    icon: 'User',
  },
} as const;

export type TabKey = keyof typeof TabPermissions;
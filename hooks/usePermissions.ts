// hooks/usePermissions.ts
import { useMemo } from 'react';
import { useAuth } from '@/context';
import { AppPaths, TabPermissions, type TabKey } from '@/constants/permissions';

interface UsePermissions {
  hasPath: (path: string) => boolean;
  hasAnyPath: (paths: string[]) => boolean;
  hasAllPaths: (paths: string[]) => boolean;
  canAccessTab: (tab: TabKey) => boolean;
  availableTabs: TabKey[];
  hasDevicesAssigned: boolean;
  hasDevicesUnassigned: boolean;
  shouldShowDevicesTabs: boolean;
}

export function usePermissions(): UsePermissions {
  const { user } = useAuth();

  const userPaths = useMemo(() => {
    return user?.paths || [];
  }, [user?.paths]);

  const hasPath = (path: string): boolean => {
    return userPaths.includes(path);
  };

  const hasAnyPath = (paths: string[]): boolean => {
    return paths.some(path => userPaths.includes(path));
  };

  const hasAllPaths = (paths: string[]): boolean => {
    return paths.every(path => userPaths.includes(path));
  };

  const canAccessTab = (tab: TabKey): boolean => {
    const permission = TabPermissions[tab];
    
    // Si no requiere permisos, siempre puede acceder
    if (permission.requiredPaths.length === 0) {
      return true;
    }

    // Si es "anyOf", con que tenga uno es suficiente
    if ('anyOf' in permission && permission.anyOf) {
      return hasAnyPath(permission.requiredPaths);
    }

    // Por defecto, requiere todos
    return hasAllPaths(permission.requiredPaths);
  };

  const availableTabs = useMemo(() => {
    return (Object.keys(TabPermissions) as TabKey[]).filter(canAccessTab);
  }, [userPaths]);

  // Helpers específicos para devices
  const hasDevicesAssigned = hasPath(AppPaths.DEVICES_ASSIGNED);
  const hasDevicesUnassigned = hasPath(AppPaths.DEVICES_UNASSIGNED);
  const shouldShowDevicesTabs = hasDevicesAssigned && hasDevicesUnassigned;

  return {
    hasPath,
    hasAnyPath,
    hasAllPaths,
    canAccessTab,
    availableTabs,
    hasDevicesAssigned,
    hasDevicesUnassigned,
    shouldShowDevicesTabs,
  };
}
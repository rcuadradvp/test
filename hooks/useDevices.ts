import { useState, useCallback, useEffect } from 'react';
import { DeviceService } from '@/services/device';
import type { AuthorizedDevicesMap } from '@/types';

export const useDevices = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    try {
      const syncTime = await DeviceService.getLastSyncTime();
      setLastSync(syncTime);
    } catch (err) {
      console.error('[useDevices] Error loading last sync time:', err);
    }
  };

  const syncDevices = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await DeviceService.syncAuthorizedDevices();
      const syncTime = new Date();
      setLastSync(syncTime);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al sincronizar dispositivos';
      setError(message);
      console.error('[useDevices] Sync error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDevicesMap = useCallback(async (): Promise<AuthorizedDevicesMap | null> => {
    try {
      return await DeviceService.getAuthorizedDevicesMap();
    } catch (err) {
      console.error('[useDevices] Error getting devices map:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    syncDevices,
    getDevicesMap,
    isLoading,
    error,
    lastSync,
    clearError,
  };
};
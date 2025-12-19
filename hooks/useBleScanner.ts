
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { BleScanner } from '@/services/ble-scanner';
import { BlePermissionsService } from '@/services/ble-permissions';
import type { BleDevice, MinewBeacon, BleScannerStatus, BlePermissions } from '@/types';
import { BleScannerState } from '@/constants/ble';

interface UseBleScanner {
  status: BleScannerStatus;
  devices: BleDevice[];
  beacons: MinewBeacon[];
  permissions: BlePermissions | null;
  startScan: (minewOnly?: boolean) => Promise<boolean>;
  stopScan: () => void;
  requestPermissions: () => Promise<boolean>;
  clearDevices: () => void;
}

export function useBleScanner(): UseBleScanner {
  const [status, setStatus] = useState<BleScannerStatus>({
    state: BleScannerState.IDLE,
    isScanning: false,
    error: null,
    devicesCount: 0,
    lastUpdate: null,
  });
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [beacons, setBeacons] = useState<MinewBeacon[]>([]);
  const [permissions, setPermissions] = useState<BlePermissions | null>(null);

  const appState = useRef(AppState.currentState);
  const bleScannerRef = useRef<BleScanner | null>(null);

  const getBleScanner = useCallback((): BleScanner => {
    if (!bleScannerRef.current) {
      bleScannerRef.current = BleScanner.getInstance();
    }
    return bleScannerRef.current;
  }, []);

  useEffect(() => {
    const bleScanner = getBleScanner();

    bleScanner.setCallbacks({
      onDeviceFound: (device) => {
        setDevices((prev) => {
          const index = prev.findIndex((d) => d.id === device.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = device;
            return updated;
          }
          return [...prev, device];
        });
      },
      onBeaconFound: (beacon) => {
        setBeacons((prev) => {
          const index = prev.findIndex((b) => b.mac === beacon.mac);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = beacon;
            return updated;
          }
          return [...prev, beacon];
        });
      },
      onError: (error) => {
        console.error('[useBleScanner] Error:', error);
      },
      onStateChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    checkPermissions();

    return () => {
      bleScanner.setCallbacks({});
    };
  }, [getBleScanner]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkPermissions();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const checkPermissions = async (): Promise<void> => {
    const perms = await BlePermissionsService.check();
    setPermissions(perms);
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const perms = await BlePermissionsService.request();
    setPermissions(perms);
    return perms.allGranted;
  }, []);

  const startScan = useCallback(async (minewOnly: boolean = false): Promise<boolean> => {
    setDevices([]);
    setBeacons([]);
    const bleScanner = getBleScanner();
    return bleScanner.startScan({ minewOnly });
  }, [getBleScanner]);

  const stopScan = useCallback((): void => {
    const bleScanner = getBleScanner();
    bleScanner.stopScan();
  }, [getBleScanner]);

  const clearDevices = useCallback((): void => {
    const bleScanner = getBleScanner();
    bleScanner.clear(); 
    setDevices([]);
    setBeacons([]);
  }, [getBleScanner]);

  return {
    status,
    devices,
    beacons,
    permissions,
    startScan,
    stopScan,
    requestPermissions,
    clearDevices,
  };
}
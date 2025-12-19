import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform, Linking, Alert } from 'react-native';
import { 
  minewScanner, 
  MinewBeacon, 
  BluetoothState, 
} from '@/services/minew-scanner';
import { BlePermissionsService } from '@/services/ble-permissions';
import { DeviceService } from '@/services/device';
import type { BlePermissions, AuthorizedDevicesMap } from '@/types';

interface UseMinewScanner {
  isScanning: boolean;
  isInitialized: boolean;
  bluetoothState: BluetoothState | null;
  beacons: MinewBeacon[];
  error: string | null;
  authorizedDevicesCount: number;
  startScan: () => Promise<boolean>;
  stopScan: () => Promise<void>;
  clearDevices: () => void;
  reloadAuthorizedDevices: () => Promise<void>;
}

export function useMinewScanner(): UseMinewScanner {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bluetoothState, setBluetoothState] = useState<BluetoothState | null>(null);
  const [beacons, setBeacons] = useState<MinewBeacon[]>([]);
  const [error, setError] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  const beaconsMapRef = useRef<Map<string, MinewBeacon>>(new Map());
  const authorizedDevicesMapRef = useRef<AuthorizedDevicesMap>({});

  const loadAuthorizedDevices = useCallback(async () => {
    try {
      const devicesMap = await DeviceService.getAuthorizedDevicesMap();
      authorizedDevicesMapRef.current = devicesMap || {};
      const deviceCount = Object.keys(authorizedDevicesMapRef.current).length;
    } catch (error) {
      console.error('[useMinewScanner] Error loading authorized devices:', error);
      authorizedDevicesMapRef.current = {};
    }
  }, []);

  const reloadAuthorizedDevices = useCallback(async () => {
    await loadAuthorizedDevices();
  }, [loadAuthorizedDevices]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setError('Minew SDK solo disponible en Android');
      return false;
    }

    if (!minewScanner.isModuleAvailable()) {
      setError('Módulo nativo no disponible');
      return false;
    }

    try {
      setError(null);
      const success = await minewScanner.initialize();
      setIsInitialized(success);

      if (success) {
        const btState = await minewScanner.getBluetoothState();
        setBluetoothState(btState);
      } else {
        const initError = minewScanner.getInitError();
        setError(initError || 'No se pudo inicializar el SDK');
      }

      return success;
    } catch (err: any) {
      const message = err?.message || 'Error al inicializar';
      setError(message);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const perms = await BlePermissionsService.request();
    
    if (!perms.allGranted) {
      const currentPerms = await BlePermissionsService.check();
      if (!currentPerms.allGranted) {
        Alert.alert(
          'Permisos necesarios',
          'Para escanear beacons necesitas conceder permisos de Bluetooth y ubicación.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Abrir configuración', 
              onPress: () => Linking.openSettings() 
            },
          ]
        );
        return false;
      }
    }
    
    return perms.allGranted;
  }, []);

  const startScan = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await loadAuthorizedDevices();

      const currentPerms = await BlePermissionsService.check();
      if (!currentPerms.allGranted) {
        const granted = await requestPermissions();
        if (!granted) {
          return false;
        }
      }

      if (!isInitialized) {
        const initialized = await initialize();
        if (!initialized) {
          return false;
        }
      }

      const btState = await minewScanner.getBluetoothState();
      setBluetoothState(btState);

      if (!btState?.isOn) {
        setError('Bluetooth está apagado. Por favor, enciéndelo.');
        Alert.alert(
          'Bluetooth apagado',
          'Necesitas encender el Bluetooth para escanear beacons.',
          [{ text: 'OK' }]
        );
        return false;
      }

      beaconsMapRef.current.clear();
      setBeacons([]);

      minewScanner.setCallbacks({
        onBeaconFound: (beacon: MinewBeacon) => {

          const authorizedName = authorizedDevicesMapRef.current[beacon.mac];

          if (!authorizedName) {
            return;
          }

          const authorizedBeacon: MinewBeacon = {
            ...beacon,
            name: authorizedName,
          };

          beaconsMapRef.current.set(beacon.mac, authorizedBeacon);
          
          setBeacons(() => {
            const updated = Array.from(beaconsMapRef.current.values());
            return updated;
          });

        },
        
        onScanStateChanged: (state) => {
          setIsScanning(state.isScanning);
        },
        
        onBluetoothStateChanged: (state) => {
          setBluetoothState(state);
          if (!state.isOn && isScanning) {
            setError('Bluetooth se apagó');
            stopScan();
          }
        },
        
        onError: (errorMsg) => {
          console.error('[useMinewScanner] SDK Error:', errorMsg);
          setError(errorMsg);
        },
      });

      const success = await minewScanner.startScan();
      
      if (success) {
        setIsScanning(true);
      } else {
        setError('No se pudo iniciar el escaneo');
        console.error('[useMinewScanner] Failed to start scan');
      }

      return success;
    } catch (err: any) {
      const message = err?.message || 'Error al iniciar escaneo';
      setError(message);
      console.error('[useMinewScanner] Start scan error:', err);
      return false;
    }
  }, [isInitialized, isScanning, initialize, requestPermissions, loadAuthorizedDevices]);

  const stopScan = useCallback(async (): Promise<void> => {
    await minewScanner.stopScan();
    setIsScanning(false);
  }, []);

  const clearDevices = useCallback(() => {
    beaconsMapRef.current.clear();
    setBeacons([]);
    minewScanner.clearCache();
  }, []);

  useEffect(() => {
    loadAuthorizedDevices();
  }, [loadAuthorizedDevices]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const btState = await minewScanner.getBluetoothState();
        setBluetoothState(btState);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScan();
      }
    };
  }, [isScanning, stopScan]);

  return {
    isScanning,
    isInitialized,
    bluetoothState,
    beacons,
    error,
    authorizedDevicesCount: Object.keys(authorizedDevicesMapRef.current).length,
    startScan,
    stopScan,
    clearDevices,
    reloadAuthorizedDevices,
  };
}
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import type { BlePermissions } from '@/types';

export const BlePermissionsService = {
  /**
   * Verifica todos los permisos necesarios
   */
  async check(): Promise<BlePermissions> {
    if (Platform.OS === 'ios') {
      return this.checkiOS();
    }
    return this.checkAndroid();
  },

  /**
   * Solicita todos los permisos necesarios
   */
  async request(): Promise<BlePermissions> {
    if (Platform.OS === 'ios') {
      return this.requestiOS();
    }
    return this.requestAndroid();
  },

  /**
   * iOS: Verificar permisos
   */
  async checkiOS(): Promise<BlePermissions> {
    // En iOS, los permisos se manejan automáticamente
    return {
      bluetooth: true,
      bluetoothScan: true,
      bluetoothConnect: true,
      location: true,
      allGranted: true,
    };
  },

  /**
   * iOS: Solicitar permisos
   */
  async requestiOS(): Promise<BlePermissions> {
    return {
      bluetooth: true,
      bluetoothScan: true,
      bluetoothConnect: true,
      location: true,
      allGranted: true,
    };
  },

  /**
   * Android: Verificar permisos
   */
  async checkAndroid(): Promise<BlePermissions> {
    const apiLevel = Platform.Version as number;

    if (apiLevel >= 31) {
      // Android 12+
      const bluetoothScan = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const bluetoothConnect = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      const location = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      return {
        bluetooth: true,
        bluetoothScan,
        bluetoothConnect,
        location,
        allGranted: bluetoothScan && bluetoothConnect && location,
      };
    } else {
      // Android 11 y anteriores
      const location = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      return {
        bluetooth: true,
        bluetoothScan: true,
        bluetoothConnect: true,
        location,
        allGranted: location,
      };
    }
  },

  /**
   * Android: Solicitar permisos
   */
  async requestAndroid(): Promise<BlePermissions> {
    const apiLevel = Platform.Version as number;

    try {
      if (apiLevel >= 31) {
        // Android 12+
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const bluetoothScan =
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted';
        const bluetoothConnect =
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted';
        const location =
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted';

        const allGranted = bluetoothScan && bluetoothConnect && location;

        if (!allGranted) {
          this.showPermissionDeniedAlert('Bluetooth y ubicación');
        }

        return {
          bluetooth: true,
          bluetoothScan,
          bluetoothConnect,
          location,
          allGranted,
        };
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Se necesita acceso a la ubicación para escanear dispositivos Bluetooth.',
            buttonPositive: 'Aceptar',
            buttonNegative: 'Cancelar',
          }
        );

        const location = result === 'granted';

        if (!location) {
          this.showPermissionDeniedAlert('ubicación');
        }

        return {
          bluetooth: true,
          bluetoothScan: true,
          bluetoothConnect: true,
          location,
          allGranted: location,
        };
      }
    } catch (error) {
      console.error('[BlePermissions] Error requesting permissions:', error);
      return {
        bluetooth: false,
        bluetoothScan: false,
        bluetoothConnect: false,
        location: false,
        allGranted: false,
      };
    }
  },

  showPermissionDeniedAlert(permission: string): void {
    Alert.alert(
      'Permisos requeridos',
      `Para escanear beacons necesitamos acceso a ${permission}. Por favor, habilítalos en la configuración.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
      ]
    );
  },
};

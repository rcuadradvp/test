import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { MinewScanner } = NativeModules;

export interface MinewFrame {
  frameType: string;
  lastUpdate: number;
  uuid?: string;
  major?: number;
  minor?: number;
  txPower?: number;
  namespaceId?: string;
  instanceId?: string;
  url?: string;
  temperature?: number;
  humidity?: number;
  xAxis?: number;
  yAxis?: number;
  zAxis?: number;
  batteryVol?: number;
  advCount?: number;
  secCount?: number;
  luxValue?: number;
  batteryVoltage?: number;
  battery?: number;
}

export interface MinewBeacon {
  mac: string;
  name: string;
  rssi: number;
  battery: number;
  timestamp: number;
  frames: MinewFrame[];
  temperature?: number;
  humidity?: number;
  uuid?: string;
  major?: number;
  minor?: number;
}

export interface BluetoothState {
  state: string;
  isOn: boolean;
}

export interface ScanState {
  isScanning: boolean;
  state: string;
}

type BeaconCallback = (beacon: MinewBeacon) => void;
type ScanStateCallback = (state: ScanState) => void;
type BluetoothStateCallback = (state: BluetoothState) => void;
type ErrorCallback = (error: string) => void;

class MinewScannerService {
  private eventEmitter: NativeEventEmitter | null = null;
  private isInitialized = false;
  private subscriptions: { remove: () => void }[] = [];
  private initError: string | null = null;

  private onBeaconFound: BeaconCallback | null = null;
  private onScanStateChanged: ScanStateCallback | null = null;
  private onBluetoothStateChanged: BluetoothStateCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor() {
    if (MinewScanner && Platform.OS === 'android') {
      this.eventEmitter = new NativeEventEmitter(MinewScanner);
    }
  }

  isModuleAvailable(): boolean {
    return !!MinewScanner;
  }

  getInitError(): string | null {
    return this.initError;
  }

  async initialize(): Promise<boolean> {
    if (!MinewScanner) {
      this.initError = 'Módulo nativo no disponible';
      if (this.onError) this.onError(this.initError);
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      await MinewScanner.initialize();
      this.setupListeners();
      this.isInitialized = true;
      this.initError = null;
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || 'Error desconocido';
      this.initError = errorMsg;
      if (this.onError) this.onError(errorMsg);
      return false;
    }
  }

  private setupListeners(): void {
    if (!this.eventEmitter) return;

    this.removeListeners();

    const beaconSub = this.eventEmitter.addListener(
      'onMinewBeaconFound',
      (beacon: MinewBeacon) => {
        if (this.onBeaconFound) {
          this.onBeaconFound(beacon);
        }
      }
    );
    this.subscriptions.push(beaconSub);

    const scanSub = this.eventEmitter.addListener(
      'onMinewScanStateChanged',
      (state: ScanState) => {
        if (this.onScanStateChanged) {
          this.onScanStateChanged(state);
        }
      }
    );
    this.subscriptions.push(scanSub);

    const btSub = this.eventEmitter.addListener(
      'onBluetoothStateChanged',
      (state: BluetoothState) => {
        if (this.onBluetoothStateChanged) {
          this.onBluetoothStateChanged(state);
        }
      }
    );
    this.subscriptions.push(btSub);
  }

  private removeListeners(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
  }

  setCallbacks(callbacks: {
    onBeaconFound?: BeaconCallback;
    onScanStateChanged?: ScanStateCallback;
    onBluetoothStateChanged?: BluetoothStateCallback;
    onError?: ErrorCallback;
  }): void {
    this.onBeaconFound = callbacks.onBeaconFound || null;
    this.onScanStateChanged = callbacks.onScanStateChanged || null;
    this.onBluetoothStateChanged = callbacks.onBluetoothStateChanged || null;
    this.onError = callbacks.onError || null;
  }

  async startScan(): Promise<boolean> {
    if (!MinewScanner) {
      if (this.onError) this.onError('Módulo nativo no disponible');
      return false;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      await MinewScanner.startScan();
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al iniciar escaneo';
      if (this.onError) this.onError(errorMsg);
      return false;
    }
  }

  async stopScan(): Promise<boolean> {
    if (!MinewScanner) return false;

    try {
      await MinewScanner.stopScan();
      return true;
    } catch (error: any) {
      return false;
    }
  }

  async clearCache(): Promise<boolean> {
    if (!MinewScanner) return false;

    try {
      await MinewScanner.clearCache();
      return true;
    } catch (error: any) {
      return false;
    }
  }

  async getBluetoothState(): Promise<BluetoothState | null> {
    if (!MinewScanner) return null;

    try {
      return await MinewScanner.getBluetoothState();
    } catch (error: any) {
      return null;
    }
  }

  async isScanning(): Promise<boolean> {
    if (!MinewScanner) return false;

    try {
      return await MinewScanner.isScanning();
    } catch (error) {
      return false;
    }
  }

  destroy(): void {
    this.removeListeners();
    this.isInitialized = false;
  }
}

export const minewScanner = new MinewScannerService();
export default minewScanner;
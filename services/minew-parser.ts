/**
 * Referencia: Minew BLE Protocol Documentation
 */
import { Buffer } from 'buffer';
import { MINEW_MANUFACTURER_ID, MinewFrameType } from '@/constants/ble';
import type { MinewBeacon } from '@/types';

export function b64ToHex(b64: string | null | undefined): string {
  if (!b64) return '';
  try {
    const bytes = Buffer.from(b64, 'base64');
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

export function isMinewBeacon(manufacturerDataHex: string): boolean {
  if (!manufacturerDataHex || manufacturerDataHex.length < 4) {
    return false;
  }

  const bytes = hexToBytes(manufacturerDataHex);
  if (bytes.length < 2) return false;

  const manufacturerId = bytes[0] | (bytes[1] << 8);
  return manufacturerId === MINEW_MANUFACTURER_ID;
}

export function parseMinewBeacon(
  mac: string,
  rssi: number,
  manufacturerDataHex: string
): MinewBeacon | null {
  if (!isMinewBeacon(manufacturerDataHex)) {
    return null;
  }

  const bytes = hexToBytes(manufacturerDataHex);
  
  if (bytes.length < 4) {
    return null;
  }

  const frameType = bytes[2];
  const productModel = bytes[3];

  const beacon: MinewBeacon = {
    mac,
    rssi,
    frameType,
    productModel,
    batteryLevel: null,
    temperature: null,
    humidity: null,
    accelerometer: null,
    uuid: null,
    major: null,
    minor: null,
    rawData: manufacturerDataHex,
    timestamp: Date.now(),
  };

  try {
    switch (frameType) {
      case MinewFrameType.DEVICE_INFO:
        parseDeviceInfoFrame(bytes, beacon);
        break;
      case MinewFrameType.TEMPERATURE_HUMIDITY:
        parseTemperatureHumidityFrame(bytes, beacon);
        break;
      case MinewFrameType.ACCELERATION:
        parseAccelerationFrame(bytes, beacon);
        break;
      case MinewFrameType.IBEACON:
        parseiBeaconFrame(bytes, beacon);
        break;
      case MinewFrameType.BATTERY:
        parseBatteryFrame(bytes, beacon);
        break;
      default:
        break;
    }
  } catch (error) {
    console.warn('[MinewParser] Error parsing frame:', error);
  }

  return beacon;
}

function parseDeviceInfoFrame(bytes: number[], beacon: MinewBeacon): void {
  // [4] Battery level (%)
  if (bytes.length > 4) {
    beacon.batteryLevel = bytes[4];
  }
}

function parseTemperatureHumidityFrame(bytes: number[], beacon: MinewBeacon): void {

  if (bytes.length >= 6) {
    const tempRaw = (bytes[4] << 8) | bytes[5];
    const tempSigned = tempRaw > 32767 ? tempRaw - 65536 : tempRaw;
    beacon.temperature = tempSigned / 256;
  }

  if (bytes.length >= 8) {
    const humidityRaw = (bytes[6] << 8) | bytes[7];
    beacon.humidity = humidityRaw / 10;
  }

  if (bytes.length >= 9) {
    beacon.batteryLevel = bytes[8];
  }
}

function parseAccelerationFrame(bytes: number[], beacon: MinewBeacon): void {
  if (bytes.length >= 10) {
    const parseAxis = (high: number, low: number): number => {
      const raw = (high << 8) | low;
      return raw > 32767 ? raw - 65536 : raw;
    };

    beacon.accelerometer = {
      x: parseAxis(bytes[4], bytes[5]),
      y: parseAxis(bytes[6], bytes[7]),
      z: parseAxis(bytes[8], bytes[9]),
    };
  }

  if (bytes.length >= 11) {
    beacon.batteryLevel = bytes[10];
  }
}

function parseiBeaconFrame(bytes: number[], beacon: MinewBeacon): void {

  if (bytes.length >= 24) {
    const uuidBytes = bytes.slice(4, 20);
    beacon.uuid = uuidBytes
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
      .toUpperCase();
    beacon.major = (bytes[20] << 8) | bytes[21];
    beacon.minor = (bytes[22] << 8) | bytes[23];
  }
}

function parseBatteryFrame(bytes: number[], beacon: MinewBeacon): void {
  if (bytes.length > 4) {
    beacon.batteryLevel = bytes[4];
  }
}

export function getFrameTypeName(frameType: number): string {
  switch (frameType) {
    case MinewFrameType.DEVICE_INFO:
      return 'Device Info';
    case MinewFrameType.TEMPERATURE_HUMIDITY:
      return 'Temp/Humidity';
    case MinewFrameType.ACCELERATION:
      return 'Acceleration';
    case MinewFrameType.IBEACON:
      return 'iBeacon';
    case MinewFrameType.BATTERY:
      return 'Battery';
    default:
      return `Unknown (0x${frameType.toString(16)})`;
  }
}
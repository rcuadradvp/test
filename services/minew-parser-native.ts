import { NativeModules } from 'react-native';

const { MinewParser } = NativeModules;

export interface MinewBeaconNative {
  frameType: number;
  productModel: number;
  rssi: number;
  rawData: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  
  accelerometer?: {
    x: number;
    y: number;
    z: number;
  };

  uuid?: string;
  major?: number;
  minor?: number;
  measuredPower?: number;

  lightLevel?: number;
  doorStatus?: number;
  name?: string;
  macAddress?: string;
}

export async function parseMinewNative(
  manufacturerDataHex: string,
  rssi: number
): Promise<MinewBeaconNative | null> {
  if (!MinewParser) {
    console.warn('[MinewParser] Native module not available');
    return null;
  }

  try {
    const result = await MinewParser.parseBeacon(manufacturerDataHex, rssi);
    return result;
  } catch (error) {
    console.error('[MinewParser] Error:', error);
    return null;
  }
}

export function isMinewParserAvailable(): boolean {
  return MinewParser !== undefined;
}
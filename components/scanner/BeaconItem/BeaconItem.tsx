// components/scanner/BeaconItem/BeaconItem.tsx
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Signal, Battery, MapPin, Thermometer, Droplets } from 'lucide-react-native';
import type { MinewBeacon } from '@/services/minew-scanner';

interface BeaconItemProps {
  beacon: MinewBeacon;
}

export function BeaconItem({ beacon }: BeaconItemProps) {
  const getRssiColor = (rssi: number): string => {
    if (rssi >= -60) return 'text-green-600';
    if (rssi >= -75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRssiStrength = (rssi: number): string => {
    if (rssi >= -60) return 'Excelente';
    if (rssi >= -75) return 'Buena';
    return 'Débil';
  };

  const getBatteryColor = (battery: number): { bg: string; text: string } => {
    if (battery > 20) {
      return { bg: 'bg-green-100', text: 'text-green-700' };
    }
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const getFrameTypeName = (frames: MinewBeacon['frames']): string => {
    if (!frames || frames.length === 0) return 'Unknown';
    
    const frameTypes = frames.map(f => f.frameType);
    if (frameTypes.includes('FrameHTSensor')) return 'Temp/Humidity';
    if (frameTypes.includes('FrameiBeacon')) return 'iBeacon';
    if (frameTypes.includes('FrameUID')) return 'Eddystone UID';
    if (frameTypes.includes('FrameURL')) return 'Eddystone URL';
    if (frameTypes.includes('FrameAccSensor')) return 'Accelerometer';
    if (frameTypes.includes('FrameTLM')) return 'Telemetry';
    
    return frames[0]?.frameType || 'Unknown';
  };

  const batteryColors = beacon.battery > 0 
    ? getBatteryColor(beacon.battery) 
    : null;

  return (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
      {/* Header - Nombre y RSSI */}
      <HStack className="items-start justify-between mb-3">
        <VStack className="flex-1 mr-3">
          <Text className="font-semibold text-base text-gray-900">
            {beacon.name || 'Sin nombre'}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            {beacon.mac}
          </Text>
        </VStack>

        <VStack className="items-end">
          <HStack className="items-center gap-1">
            <Icon 
              as={Signal} 
              size="sm" 
              className={getRssiColor(beacon.rssi)}
            />
            <Text className={`font-bold text-base ${getRssiColor(beacon.rssi)}`}>
              {beacon.rssi}
            </Text>
          </HStack>
          <Text className="text-xs text-gray-500 mt-0.5">
            {getRssiStrength(beacon.rssi)}
          </Text>
        </VStack>
      </HStack>

      {/* Badges - Tipo de Frame */}
      <HStack className="flex-wrap gap-2 mb-2">
        <View className="bg-gray-100 px-3 py-1.5 rounded-full">
          <Text className="text-xs font-medium text-gray-600">
            {getFrameTypeName(beacon.frames)}
          </Text>
        </View>

        {/* Batería */}
        {beacon.battery > 0 && batteryColors && (
          <View className={`px-3 py-1.5 rounded-full ${batteryColors.bg}`}>
            <HStack className="items-center gap-1">
              <Icon 
                as={Battery} 
                size="xs" 
                className={batteryColors.text}
              />
              <Text className={`text-xs font-medium ${batteryColors.text}`}>
                {beacon.battery}%
              </Text>
            </HStack>
          </View>
        )}

        {/* UUID/Major/Minor para iBeacon */}
        {beacon.uuid && (
          <View className="bg-purple-100 px-3 py-1.5 rounded-full">
            <HStack className="items-center gap-1">
              <Icon 
                as={MapPin} 
                size="xs" 
                className="text-purple-700"
              />
              <Text className="text-xs font-medium text-purple-700">
                {beacon.major}/{beacon.minor}
              </Text>
            </HStack>
          </View>
        )}
      </HStack>

      {/* Sensores - Temperatura y Humedad */}
      {(beacon.temperature !== undefined || beacon.humidity !== undefined) && (
        <HStack className="flex-wrap gap-2">
          {beacon.temperature !== undefined && (
            <View className="bg-blue-100 px-3 py-1.5 rounded-full">
              <HStack className="items-center gap-1">
                <Icon 
                  as={Thermometer} 
                  size="xs" 
                  className="text-blue-700"
                />
                <Text className="text-xs font-medium text-blue-700">
                  {beacon.temperature.toFixed(1)}°C
                </Text>
              </HStack>
            </View>
          )}

          {beacon.humidity !== undefined && (
            <View className="bg-cyan-100 px-3 py-1.5 rounded-full">
              <HStack className="items-center gap-1">
                <Icon 
                  as={Droplets} 
                  size="xs" 
                  className="text-cyan-700"
                />
                <Text className="text-xs font-medium text-cyan-700">
                  {beacon.humidity.toFixed(1)}%
                </Text>
              </HStack>
            </View>
          )}
        </HStack>
      )}

      {/* UUID completo */}
      {beacon.uuid && (
        <Text className="text-gray-400 text-xs mt-3" numberOfLines={1}>
          UUID: {beacon.uuid}
        </Text>
      )}
    </View>
  );
}
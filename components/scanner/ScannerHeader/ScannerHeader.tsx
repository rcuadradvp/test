// components/scanner/ScannerHeader/ScannerHeader.tsx
import { View, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';

interface ScannerHeaderProps {
  isScanning: boolean;
  beaconCount: number;
  error: string | null;
  onToggleScan: () => void;
}

export function ScannerHeader({
  isScanning,
  beaconCount,
  error,
  onToggleScan,
}: ScannerHeaderProps) {
  return (
    <View className="bg-white px-4 py-3 border-b border-gray-200">
      <HStack className="items-center justify-between">
        <HStack className="items-center flex-1 gap-2">
          {isScanning && (
            <ActivityIndicator size="small" color="#333" />
          )}
          <Text className="text-gray-600 text-sm">
            {isScanning
              ? `Escaneando... (${beaconCount})`
              : `${beaconCount} beacon${beaconCount !== 1 ? 's' : ''}`}
          </Text>
        </HStack>

        <Pressable
          className={`px-4 py-2 rounded-lg flex-row items-center gap-2 ${
            isScanning 
              ? 'bg-error-500 active:bg-error-600' 
              : 'bg-primary-500 active:bg-primary-600'
          }`}
          onPress={onToggleScan}
        >
          <Text className="text-white font-semibold text-sm">
            {isScanning ? 'Detener' : 'Escanear'}
          </Text>
        </Pressable>
      </HStack>

      {error && !isScanning && (
        <Text className="text-error-500 text-xs mt-2">
          {error}
        </Text>
      )}
    </View>
  );
}
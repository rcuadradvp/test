// components/scanner/EmptyBeaconState/EmptyBeaconState.tsx
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Search, Radio } from 'lucide-react-native';

interface EmptyBeaconStateProps {
  isScanning: boolean;
}

export function EmptyBeaconState({ isScanning }: EmptyBeaconStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <VStack className="items-center gap-4">
        <View className="bg-gray-100 rounded-full p-6">
          <Icon 
            as={isScanning ? Search : Radio} 
            size="xl" 
            className="text-gray-400"
          />
        </View>
        
        <VStack className="items-center gap-2">
          <Text className="text-gray-600 text-lg font-medium text-center">
            {isScanning ? 'Buscando beacons...' : 'Sin beacons detectados'}
          </Text>
          <Text className="text-gray-400 text-sm text-center">
            {isScanning
              ? 'Acerca un beacon Minew para detectarlo'
              : 'Presiona "Escanear" para buscar beacons cercanos'}
          </Text>
        </VStack>
      </VStack>
    </View>
  );
}
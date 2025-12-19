// screens/devices/DevicesAssignedScreen/DevicesAssignedScreen.tsx
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export function DevicesAssignedScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <VStack className="flex-1 px-4 pt-4 bg-background-0">
        <Heading size="2xl" className="mb-6">
          Dispositivos Asignados
        </Heading>

        <View className="flex-1 items-center justify-center">
          <Text className="text-typography-500 text-center">
            Próximamente: Lista de dispositivos asignados
          </Text>
        </View>
      </VStack>
    </SafeAreaView>
  );
}
// screens/devices/DevicesMenuScreen/DevicesMenuScreen.tsx
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Package, PackageOpen, ChevronRight } from 'lucide-react-native';

export function DevicesMenuScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <VStack className="flex-1 px-4 pt-4 bg-background-0">
        <Heading size="2xl" className="mb-6">
          Dispositivos
        </Heading>

        <VStack className="gap-4">
          {/* Card: Dispositivos Asignados */}
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/devices/assigned' as any)}
          >
            <Box className="rounded-xl p-5 border border-primary-50 active:bg-primary-100">
              <HStack className="items-center justify-between">
                <HStack className="items-center gap-4 flex-1">
                  <VStack className="flex-1">
                    <Text className="font-semibold text-lg text-typography-900">
                      V-tags asignados a un V-gate
                    </Text>
                    <Text className="text-sm text-typography-500 mt-1">
                      Se generaran alertas al salir del radar del V-gate
                    </Text>
                  </VStack>
                </HStack>
                <Icon 
                  as={ChevronRight} 
                  size="md" 
                  className="text-typography-400"
                />
              </HStack>
            </Box>
          </Pressable>

          {/* Card: Dispositivos Sin Asignar */}
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/devices/unassigned' as any)}
          >
            <Box className="rounded-xl p-5 border border-primary-50 active:bg-primary-100">
              <HStack className="items-center justify-between">
                <HStack className="items-center gap-4 flex-1">
                  <VStack className="flex-1">
                    <Text className="font-semibold text-lg text-typography-900">
                      V-tags sin asignar
                    </Text>
                    <Text className="text-sm text-typography-500 mt-1">
                      Se generaran alertas al entrar en el radar del V-gate
                    </Text>
                  </VStack>
                </HStack>
                <Icon 
                  as={ChevronRight} 
                  size="md" 
                  className="text-typography-400"
                />
              </HStack>
            </Box>
          </Pressable>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
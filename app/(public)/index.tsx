import { View } from 'react-native';
import { Link } from 'expo-router';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';

/**
 * Landing Page
 * Primera pantalla que ve el usuario no autenticado
 */
export default function LandingPage() {
  return (
    <View className="flex-1 bg-white">
      <Box className="flex-1 items-center justify-center p-6">
        <VStack space="xl" className="w-full max-w-md">
          {/* Logo o título */}
          <VStack space="sm" className="items-center">
            <Heading size="3xl" className="text-center">
              Welcome
            </Heading>
            <Text size="lg" className="text-center text-typography-500">
              Tu template empresarial multiplataforma
            </Text>
          </VStack>

          {/* Botones de acción */}
          <VStack space="md" className="w-full">
            <Link href="/(public)/login" asChild>
              <Button size="lg" className="w-full">
                <ButtonText>Iniciar Sesión</ButtonText>
              </Button>
            </Link>

            <Link href="/(public)/register" asChild>
              <Button size="lg" variant="outline" className="w-full">
                <ButtonText>Crear Cuenta</ButtonText>
              </Button>
            </Link>
          </VStack>

          {/* Features del template */}
          <VStack space="sm" className="mt-8">
            <Text size="sm" className="text-center text-typography-400">
              ✓ Autenticación OAuth
            </Text>
            <Text size="sm" className="text-center text-typography-400">
              ✓ Multiplataforma (Web, iOS, Android)
            </Text>
            <Text size="sm" className="text-center text-typography-400">
              ✓ Sistema de tokens con refresh automático
            </Text>
          </VStack>
        </VStack>
      </Box>
    </View>
  );
}

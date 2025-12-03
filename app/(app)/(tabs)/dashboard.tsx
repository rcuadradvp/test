import { View, ScrollView } from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';

/**
 * Dashboard Principal
 * Pantalla principal después del login
 */
export default function DashboardScreen() {
  const { userLogged } = useAuthContext();

  return (
    <ScrollView className="flex-1 bg-background-0">
      <Box className="p-6">
        <VStack space="xl">
          {/* Header */}
          <VStack space="sm">
            <Heading size="2xl">Dashboard</Heading>
            <Text size="md" className="text-typography-500">
              Bienvenido, {userLogged?.name}
            </Text>
          </VStack>

          {/* Stats Cards */}
          <VStack space="md">
            <HStack space="md" className="flex-wrap">
              {/* Card 1 */}
              <Card className="flex-1 min-w-[150px] p-4">
                <VStack space="sm">
                  <Text size="sm" className="text-typography-500">
                    Total Usuarios
                  </Text>
                  <Heading size="xl">1,234</Heading>
                  <Text size="xs" className="text-success-600">
                    +12% este mes
                  </Text>
                </VStack>
              </Card>

              {/* Card 2 */}
              <Card className="flex-1 min-w-[150px] p-4">
                <VStack space="sm">
                  <Text size="sm" className="text-typography-500">
                    Ingresos
                  </Text>
                  <Heading size="xl">$45.2K</Heading>
                  <Text size="xs" className="text-success-600">
                    +8% este mes
                  </Text>
                </VStack>
              </Card>
            </HStack>

            <HStack space="md" className="flex-wrap">
              {/* Card 3 */}
              <Card className="flex-1 min-w-[150px] p-4">
                <VStack space="sm">
                  <Text size="sm" className="text-typography-500">
                    Tareas Pendientes
                  </Text>
                  <Heading size="xl">23</Heading>
                  <Text size="xs" className="text-error-600">
                    5 urgentes
                  </Text>
                </VStack>
              </Card>

              {/* Card 4 */}
              <Card className="flex-1 min-w-[150px] p-4">
                <VStack space="sm">
                  <Text size="sm" className="text-typography-500">
                    Satisfacción
                  </Text>
                  <Heading size="xl">94%</Heading>
                  <Text size="xs" className="text-success-600">
                    +3% este mes
                  </Text>
                </VStack>
              </Card>
            </HStack>
          </VStack>

          {/* Recent Activity */}
          <VStack space="md">
            <Heading size="lg">Actividad Reciente</Heading>
            
            <Card className="p-4">
              <VStack space="md">
                <HStack space="sm" className="items-center">
                  <Box className="w-2 h-2 rounded-full bg-primary-500" />
                  <VStack className="flex-1">
                    <Text size="sm" className="font-semibold">
                      Nuevo usuario registrado
                    </Text>
                    <Text size="xs" className="text-typography-500">
                      Hace 5 minutos
                    </Text>
                  </VStack>
                </HStack>

                <HStack space="sm" className="items-center">
                  <Box className="w-2 h-2 rounded-full bg-success-500" />
                  <VStack className="flex-1">
                    <Text size="sm" className="font-semibold">
                      Venta completada
                    </Text>
                    <Text size="xs" className="text-typography-500">
                      Hace 1 hora
                    </Text>
                  </VStack>
                </HStack>

                <HStack space="sm" className="items-center">
                  <Box className="w-2 h-2 rounded-full bg-warning-500" />
                  <VStack className="flex-1">
                    <Text size="sm" className="font-semibold">
                      Tarea asignada
                    </Text>
                    <Text size="xs" className="text-typography-500">
                      Hace 3 horas
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </Card>
          </VStack>

          {/* Company Info */}
          <Card className="p-4 bg-primary-50">
            <VStack space="sm">
              <Text size="sm" className="font-semibold text-primary-700">
                Empresa Actual
              </Text>
              <Text size="md" className="font-bold">
                {userLogged?.companyName}
              </Text>
              <Text size="xs" className="text-typography-600">
                Rol: {userLogged?.role}
              </Text>
            </VStack>
          </Card>
        </VStack>
      </Box>
    </ScrollView>
  );
}

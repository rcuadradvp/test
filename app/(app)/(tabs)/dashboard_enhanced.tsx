import { View, ScrollView, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart,
  ArrowUp,
  ArrowDown
} from 'lucide-react-native';

/**
 * Dashboard con estadísticas y gráficas
 */
export default function DashboardScreen() {
  const { userLogged } = useAuthContext();
  const screenWidth = Dimensions.get('window').width;

  // Datos de ejemplo - Reemplazar con datos reales de Supabase
  const stats = [
    {
      title: 'Ingresos Totales',
      value: '$45,231',
      change: '+20.1%',
      isPositive: true,
      icon: DollarSign,
      color: 'success',
    },
    {
      title: 'Usuarios Activos',
      value: '1,234',
      change: '+12.5%',
      isPositive: true,
      icon: Users,
      color: 'primary',
    },
    {
      title: 'Ventas',
      value: '892',
      change: '-5.2%',
      isPositive: false,
      icon: ShoppingCart,
      color: 'warning',
    },
    {
      title: 'Conversión',
      value: '4.2%',
      change: '+2.1%',
      isPositive: true,
      icon: TrendingUp,
      color: 'info',
    },
  ];

  const recentActivity = [
    {
      title: 'Nueva venta registrada',
      description: 'Orden #1234 - $250.00',
      time: 'Hace 5 minutos',
    },
    {
      title: 'Nuevo usuario registrado',
      description: 'Juan Pérez se unió',
      time: 'Hace 12 minutos',
    },
    {
      title: 'Reporte generado',
      description: 'Reporte mensual disponible',
      time: 'Hace 1 hora',
    },
    {
      title: 'Actualización de sistema',
      description: 'Versión 2.1.0 instalada',
      time: 'Hace 2 horas',
    },
  ];

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: 'Dashboard', headerShown: false }} />
      
      <ScrollView className="flex-1">
        <Box className="p-6">
          <VStack space="xl">
            {/* Saludo */}
            <VStack space="xs">
              <Heading size="2xl">
                ¡Hola, {userLogged?.name.split(' ')[0]}! 👋
              </Heading>
              <Text size="md" className="text-typography-500">
                Aquí está un resumen de tu negocio hoy
              </Text>
            </VStack>

            {/* Stats Cards */}
            <VStack space="md">
              {screenWidth >= 768 ? (
                // Desktop: 2x2 grid
                <>
                  <HStack space="md">
                    {stats.slice(0, 2).map((stat, index) => (
                      <StatCard key={index} stat={stat} />
                    ))}
                  </HStack>
                  <HStack space="md">
                    {stats.slice(2, 4).map((stat, index) => (
                      <StatCard key={index} stat={stat} />
                    ))}
                  </HStack>
                </>
              ) : (
                // Mobile: Stack vertical
                <>
                  {stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} />
                  ))}
                </>
              )}
            </VStack>

            {/* Quick Actions */}
            <Card className="p-4">
              <VStack space="md">
                <Heading size="lg">Acciones Rápidas</Heading>
                <HStack space="md" className="flex-wrap">
                  <Box className="flex-1 min-w-[140px] bg-primary-50 rounded-lg p-4">
                    <VStack space="xs" className="items-center">
                      <Icon as={Users} size="lg" className="text-primary-600" />
                      <Text className="text-primary-900 font-medium text-center">
                        Ver Usuarios
                      </Text>
                    </VStack>
                  </Box>
                  <Box className="flex-1 min-w-[140px] bg-success-50 rounded-lg p-4">
                    <VStack space="xs" className="items-center">
                      <Icon as={ShoppingCart} size="lg" className="text-success-600" />
                      <Text className="text-success-900 font-medium text-center">
                        Nueva Venta
                      </Text>
                    </VStack>
                  </Box>
                </HStack>
              </VStack>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <VStack space="md">
                <Heading size="lg">Actividad Reciente</Heading>
                <VStack space="sm">
                  {recentActivity.map((activity, index) => (
                    <Box key={index}>
                      <HStack space="md" className="items-start">
                        <Box className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                        <VStack className="flex-1">
                          <Text className="font-semibold text-typography-900">
                            {activity.title}
                          </Text>
                          <Text size="sm" className="text-typography-600">
                            {activity.description}
                          </Text>
                          <Text size="xs" className="text-typography-400 mt-1">
                            {activity.time}
                          </Text>
                        </VStack>
                      </HStack>
                      {index < recentActivity.length - 1 && (
                        <Box className="h-[1px] bg-outline-200 my-3 ml-6" />
                      )}
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </Card>

            {/* Company Info */}
            <Card className="p-4 bg-gradient-to-r from-primary-50 to-primary-100">
              <HStack space="md" className="items-center">
                <Box className="w-12 h-12 rounded-full bg-primary-500 items-center justify-center">
                  <Text className="text-white font-bold text-lg">
                    {userLogged?.companyName.charAt(0)}
                  </Text>
                </Box>
                <VStack className="flex-1">
                  <Text className="font-semibold text-typography-900">
                    {userLogged?.companyName}
                  </Text>
                  <Text size="sm" className="text-typography-600">
                    {userLogged?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </Text>
                </VStack>
                <Box
                  className={`px-3 py-1 rounded-full ${
                    userLogged?.companyActive ? 'bg-success-500' : 'bg-error-500'
                  }`}
                >
                  <Text size="xs" className="text-white font-medium">
                    {userLogged?.companyActive ? 'Activo' : 'Inactivo'}
                  </Text>
                </Box>
              </HStack>
            </Card>
          </VStack>
        </Box>
      </ScrollView>
    </View>
  );
}

// Componente de tarjeta de estadística
function StatCard({ stat }: { stat: any }) {
  return (
    <Card className="flex-1 p-4">
      <VStack space="md">
        <HStack className="justify-between items-start">
          <VStack className="flex-1">
            <Text size="sm" className="text-typography-500">
              {stat.title}
            </Text>
            <Heading size="2xl" className="mt-1">
              {stat.value}
            </Heading>
          </VStack>
          <Box
            className={`w-10 h-10 rounded-lg bg-${stat.color}-100 items-center justify-center`}
          >
            <Icon as={stat.icon} size="sm" className={`text-${stat.color}-600`} />
          </Box>
        </HStack>

        <HStack space="xs" className="items-center">
          <Icon
            as={stat.isPositive ? ArrowUp : ArrowDown}
            size="xs"
            className={stat.isPositive ? 'text-success-600' : 'text-error-600'}
          />
          <Text
            size="sm"
            className={
              stat.isPositive
                ? 'text-success-600 font-medium'
                : 'text-error-600 font-medium'
            }
          >
            {stat.change}
          </Text>
          <Text size="sm" className="text-typography-400">
            vs mes anterior
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

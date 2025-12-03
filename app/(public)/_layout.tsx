import { Stack, Redirect } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

/**
 * Layout de Rutas Públicas
 * - Si el usuario ya está autenticado, redirige al dashboard
 * - Muestra splash screen mientras inicializa
 */
export default function PublicLayout() {
  const { isAuthenticated, isInitializing } = useAuthContext();

  // Mostrar loading mientras verifica la sesión
  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}

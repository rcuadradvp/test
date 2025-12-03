import { Redirect, Stack } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

/**
 * Layout de Rutas Privadas (Protegidas)
 * - Verifica que el usuario esté autenticado
 * - Si no lo está, redirige al login
 * - Muestra splash screen mientras inicializa
 */
export default function AppLayout() {
  const { isAuthenticated, isInitializing } = useAuthContext();

  // Mostrar loading mientras verifica la sesión
  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Redirect href="/(public)" />;
  }

  // Si está autenticado, mostrar las rutas privadas
  // Por ahora usamos Stack, en el siguiente paso agregamos Tabs/Drawer
 return (
  <Stack
    screenOptions={{
      headerShown: false,
    }}
  />
); // Se renderiza automáticamente con las rutas hijas
}

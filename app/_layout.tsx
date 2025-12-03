import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthContextProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

/**
 * Root Layout
 * - Envuelve toda la app con providers necesarios
 * - ThemeProvider: Maneja dark mode
 * - AuthContextProvider: Maneja la autenticación global
 * - GluestackUIProvider: Sistema de diseño
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <GluestackUIProvider>
        <AuthContextProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* Rutas públicas */}
            <Stack.Screen name="(public)" />
            
            {/* Rutas privadas */}
            <Stack.Screen name="(app)" />
          </Stack>
        </AuthContextProvider>
      </GluestackUIProvider>
    </ThemeProvider>
  );
}

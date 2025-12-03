import '../global.css';
import { Stack } from 'expo-router';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthContextProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function AppContent({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <GluestackUIProvider mode={resolvedTheme}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent>
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
      </AppContent>
    </ThemeProvider>
  );
}
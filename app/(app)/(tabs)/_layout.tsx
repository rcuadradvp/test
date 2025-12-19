// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Radar, SmartphoneNfc, User } from 'lucide-react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function AppLayout() {
  const { canAccessTab } = usePermissions();

  return (
    <PermissionGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#333',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#eee',
          },
        }}
      >
        {/* Devices Tab */}
        {canAccessTab('devices') && (
          <Tabs.Screen
            name="devices"
            options={{
              title: 'V-tags',
              tabBarIcon: ({ color, size }) => (
                <Icon as={SmartphoneNfc} size={size as any} color={color} />
              ),
            }}
          />
        )}

        {/* Scanner Tab */}
        {canAccessTab('scanner') && (
          <Tabs.Screen
            name="scanner"
            options={{
              title: 'Buscar',
              tabBarIcon: ({ color, size }) => (
                <Icon as={Radar} size={size as any} color={color} />
              ),
            }}
          />
        )}

        {/* Profile Tab - Siempre visible */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Icon as={User} size={size as any} color={color} />
            ),
          }}
        />

        {/* Ocultar home */}
        <Tabs.Screen
          name="home"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </PermissionGuard>
  );
}
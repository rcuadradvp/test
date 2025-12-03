import { Tabs } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Home, User, Settings } from 'lucide-react-native';
import { View } from 'react-native';
import { Sidebar } from '@/components/Sidebar';
import { useResponsive } from '@/hooks/useResponsive';

export default function TabsLayout() {
  const { shouldUseSidebar } = useResponsive();

  if (shouldUseSidebar) {
    return (
      <View className="flex-1 flex-row">
        <Sidebar />
        <View className="flex-1">
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // Ocultar tabs en desktop
            }}
          >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="settings" />
          </Tabs>
        </View>
      </View>
    );
  }

  // 📱 Mobile/Tablet: Mostrar tabs normales
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Icon as={Home} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Icon as={User} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <Icon as={Settings} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

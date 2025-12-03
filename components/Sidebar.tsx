import { View, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Home, User, LogOut, Menu, X, Settings, Users } from 'lucide-react-native';
import { useAuthContext } from '@/context/AuthContext';
import { useState } from 'react';
import { Divider } from '@/components/ui/divider';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBadge } from '@/components/NotificationBadge';

type MenuItem = {
  name: string;
  path: string;
  icon: any;
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userLogged, logout } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (!confirmed) return;
    }
    
    await logout();
    router.replace('/(public)' as any);
  };

  // Menu items base
  const baseMenuItems: MenuItem[] = [
    { 
      name: 'Dashboard', 
      path: '/(app)/(tabs)/dashboard', 
      icon: Home 
    },
    { 
      name: 'Perfil', 
      path: '/(app)/(tabs)/profile', 
      icon: User 
    },
    { 
      name: 'Configuración', 
      path: '/(app)/(tabs)/settings', 
      icon: Settings 
    },
  ];

  // Agregar Users solo si es admin
  const menuItems: MenuItem[] = userLogged?.role === 'admin'
    ? [
        ...baseMenuItems.slice(0, 1), // Dashboard
        { 
          name: 'Usuarios', 
          path: '/(app)/users', 
          icon: Users 
        },
        ...baseMenuItems.slice(1), // Perfil y Configuración
      ]
    : baseMenuItems;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box 
      className={`h-full bg-white border-r border-outline-200 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        boxShadow: Platform.OS === 'web' ? '2px 0 8px rgba(0,0,0,0.05)' : undefined,
      }}
    >
      <VStack space="md" className="h-full p-4">
        {/* Header con Toggle */}
        <HStack className="items-center justify-between pb-2">
          {!isCollapsed && (
            <VStack space="xs" className="flex-1">
              <Text className="text-lg font-bold text-typography-900">
                {userLogged?.companyName}
              </Text>
              <Text className="text-xs text-typography-500">
                {userLogged?.role}
              </Text>
            </VStack>
          )}
          
          <HStack space="xs">
            <NotificationBadge size="sm" />
            <ThemeToggle size="sm" />
            <Pressable
              onPress={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-background-100"
            >
              <Icon 
                as={isCollapsed ? Menu : X} 
                size="sm"
                className="text-typography-600"
              />
            </Pressable>
          </HStack>
        </HStack>

        <Divider className="my-1" />

        {/* User Info */}
        {!isCollapsed && (
          <HStack space="sm" className="items-center p-3 bg-background-50 rounded-lg">
            <Avatar size="sm" className="bg-primary-500">
              <AvatarFallbackText>
                {getInitials(userLogged?.name || 'User')}
              </AvatarFallbackText>
            </Avatar>
            <VStack className="flex-1">
              <Text className="text-sm font-semibold text-typography-900">
                {userLogged?.name}
              </Text>
              <Text className="text-xs text-typography-500">
                {userLogged?.email}
              </Text>
            </VStack>
          </HStack>
        )}

        {isCollapsed && (
          <View className="items-center py-2">
            <Avatar size="md" className="bg-primary-500">
              <AvatarFallbackText>
                {getInitials(userLogged?.name || 'User')}
              </AvatarFallbackText>
            </Avatar>
          </View>
        )}

        {/* Menu Items */}
        <VStack space="xs" className="flex-1 pt-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Pressable
                key={item.path}
                onPress={() => router.push(item.path as any)}
                className={`flex-row items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100' 
                    : 'hover:bg-background-100'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon 
                  as={item.icon} 
                  size="sm"
                  className={isActive ? 'text-primary-600' : 'text-typography-600'}
                />
                {!isCollapsed && (
                  <Text 
                    className={`text-sm ${
                      isActive 
                        ? 'text-primary-600 font-semibold' 
                        : 'text-typography-700'
                    }`}
                  >
                    {item.name}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </VStack>

        <Divider className="my-2" />

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          className={`flex-row items-center gap-3 p-3 rounded-lg hover:bg-error-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Icon as={LogOut} size="sm" className="text-error-600" />
          {!isCollapsed && (
            <Text className="text-sm text-error-600 font-medium">
              Cerrar Sesión
            </Text>
          )}
        </Pressable>
      </VStack>
    </Box>
  );
}

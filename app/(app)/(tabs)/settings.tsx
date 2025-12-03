import { View, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { 
  Sun, 
  Moon, 
  Monitor, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Info,
  LogOut,
  ChevronRight
} from 'lucide-react-native';
import { Divider } from '@/components/ui/divider';
import { useState } from 'react';

type SettingItem = {
  icon: any;
  title: string;
  description: string;
  onPress: () => void;
  value?: string;
  showChevron?: boolean;
};

/**
 * Pantalla de Configuración
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { userLogged, logout } = useAuthContext();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeChange = () => {
    if (Platform.OS === 'web') {
      const options = ['light', 'dark', 'system'];
      const current = options.indexOf(theme);
      const next = options[(current + 1) % options.length];
      setTheme(next as any);
    } else {
      Alert.alert(
        'Seleccionar Tema',
        'Elige tu preferencia de tema',
        [
          { text: 'Claro', onPress: () => setTheme('light') },
          { text: 'Oscuro', onPress: () => setTheme('dark') },
          { text: 'Sistema', onPress: () => setTheme('system') },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace("/(public)" as Href);
            },
          },
        ]
      );
      return;
    }

    await logout();
    router.replace("/(public)" as Href);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return Monitor;
    if (theme === 'dark') return Moon;
    return Sun;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return `Sistema (${resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'})`;
    if (theme === 'dark') return 'Oscuro';
    return 'Claro';
  };

  const appearanceSettings: SettingItem[] = [
    {
      icon: getThemeIcon(),
      title: 'Tema',
      description: 'Personaliza la apariencia de la app',
      value: getThemeLabel(),
      onPress: handleThemeChange,
      showChevron: true,
    },
  ];

  const accountSettings: SettingItem[] = [
    {
      icon: User,
      title: 'Perfil',
      description: 'Edita tu información personal',
      onPress: () => router.push('/(app)/(tabs)/profile' as Href),
      showChevron: true,
    },
    {
      icon: Bell,
      title: 'Notificaciones',
      description: 'Administra tus notificaciones',
      onPress: () => Alert.alert('Próximamente', 'Función en desarrollo'),
      showChevron: true,
    },
    {
      icon: Shield,
      title: 'Privacidad y Seguridad',
      description: 'Configura la seguridad de tu cuenta',
      onPress: () => Alert.alert('Próximamente', 'Función en desarrollo'),
      showChevron: true,
    },
  ];

  const generalSettings: SettingItem[] = [
    {
      icon: Globe,
      title: 'Idioma',
      description: 'Español',
      onPress: () => Alert.alert('Próximamente', 'Función en desarrollo'),
      showChevron: true,
    },
    {
      icon: Info,
      title: 'Acerca de',
      description: 'Versión 1.0.0',
      onPress: () => Alert.alert('Template App', 'Versión 1.0.0\n\nDesarrollado con Expo + Supabase'),
      showChevron: true,
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background-0">
      <Box className="p-6">
        <VStack space="xl">
          {/* Header */}
          <VStack space="sm">
            <Heading size="2xl">Configuración</Heading>
            <Text size="md" className="text-typography-500">
              Personaliza tu experiencia
            </Text>
          </VStack>

          {/* User Info Card */}
          <Card className="p-4 bg-primary-50">
            <HStack space="sm" className="items-center">
              <Box className="w-12 h-12 rounded-full bg-primary-500 items-center justify-center">
                <Text className="text-white text-lg font-bold">
                  {userLogged?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </Box>
              <VStack className="flex-1">
                <Text className="font-semibold text-typography-900">
                  {userLogged?.name}
                </Text>
                <Text className="text-sm text-typography-500">
                  {userLogged?.email}
                </Text>
              </VStack>
            </HStack>
          </Card>

          {/* Apariencia */}
          <VStack space="md">
            <Heading size="md">Apariencia</Heading>
            <Card>
              {appearanceSettings.map((item, index) => (
                <View key={item.title}>
                  <SettingItemComponent item={item} />
                  {index < appearanceSettings.length - 1 && <Divider className="my-1" />}
                </View>
              ))}
            </Card>
          </VStack>

          {/* Cuenta */}
          <VStack space="md">
            <Heading size="md">Cuenta</Heading>
            <Card>
              {accountSettings.map((item, index) => (
                <View key={item.title}>
                  <SettingItemComponent item={item} />
                  {index < accountSettings.length - 1 && <Divider className="my-1" />}
                </View>
              ))}
            </Card>
          </VStack>

          {/* General */}
          <VStack space="md">
            <Heading size="md">General</Heading>
            <Card>
              {generalSettings.map((item, index) => (
                <View key={item.title}>
                  <SettingItemComponent item={item} />
                  {index < generalSettings.length - 1 && <Divider className="my-1" />}
                </View>
              ))}
            </Card>
          </VStack>

          {/* Logout Button */}
          <Button
            variant="solid"
            action="negative"
            size="lg"
            onPress={handleLogout}
          >
            <HStack space="sm" className="items-center">
              <Icon as={LogOut} size="sm" className="text-white" />
              <ButtonText>Cerrar Sesión</ButtonText>
            </HStack>
          </Button>

          {/* Footer */}
          <Text className="text-center text-xs text-typography-400">
            Template App v1.0.0
          </Text>
        </VStack>
      </Box>
    </ScrollView>
  );
}

function SettingItemComponent({ item }: { item: SettingItem }) {
  return (
    <Box
      className="p-4 active:bg-background-50 cursor-pointer"
      // @ts-ignore
      onClick={item.onPress}
      onTouchEnd={item.onPress}
    >
      <HStack space="md" className="items-center">
        <Box className="w-10 h-10 rounded-lg bg-background-100 items-center justify-center">
          <Icon as={item.icon} size="sm" className="text-typography-600" />
        </Box>
        <VStack className="flex-1">
          <Text className="font-medium text-typography-900">
            {item.title}
          </Text>
          <Text className="text-sm text-typography-500">
            {item.value || item.description}
          </Text>
        </VStack>
        {item.showChevron && (
          <Icon as={ChevronRight} size="sm" className="text-typography-400" />
        )}
      </HStack>
    </Box>
  );
}

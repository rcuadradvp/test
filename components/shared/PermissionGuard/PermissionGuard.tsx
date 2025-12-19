// components/shared/PermissionGuard/PermissionGuard.tsx
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context';
import { usePermissions } from '@/hooks/usePermissions';
import { View, ActivityIndicator } from 'react-native';

interface PermissionGuardProps {
  children: React.ReactNode;
}

export function PermissionGuard({ children }: PermissionGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { availableTabs } = usePermissions();

  useEffect(() => {
    // Si no está autenticado, redirect a login
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    // Si está autenticado pero no tiene tabs disponibles
    if (!isLoading && isAuthenticated && availableTabs.length === 0) {
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, isLoading, availableTabs]);

  // Mostrar loading mientras verifica
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  // Si no está autenticado, no renderizar nada (el useEffect hace el redirect)
  if (!isAuthenticated || availableTabs.length === 0) {
    return null;
  }

  // Todo bien, mostrar children
  return <>{children}</>;
}
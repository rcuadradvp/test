// app/(app)/(tabs)/devices/_layout.tsx
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { usePermissions } from '@/hooks/usePermissions';

export default function DevicesLayout() {
  const { 
    hasDevicesAssigned, 
    hasDevicesUnassigned,
  } = usePermissions();

  // Si no tiene ningún permiso
  if (!hasDevicesAssigned && !hasDevicesUnassigned) {
    return <Redirect href="/(app)/(tabs)/profile" />;
  }

  // Si solo tiene uno, redirect directo
  if (hasDevicesAssigned && !hasDevicesUnassigned) {
    return <Redirect href="/(app)/(tabs)/devices/assigned" />;
  }

  if (hasDevicesUnassigned && !hasDevicesAssigned) {
    return <Redirect href="/(app)/(tabs)/devices/unassigned" />;
  }

  // Si tiene ambos, mostrar el stack
  return <Stack screenOptions={{ headerShown: false }} />;
}
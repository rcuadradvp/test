// screens/profile/ProfileScreen/ProfileScreen.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { useAuth } from '@/context';
import { useDevices } from '@/hooks';
import { BleScanner } from '@/services/ble-scanner';
import { UserInfoCard } from '@/components/profile/UserInfoCard';
import { DeviceSyncCard } from '@/components/profile/DeviceSyncCard';
import { BiometricSettingsCard } from '@/components/profile/BiometricSettingsCard';
import { LoadingButton } from '@/components/shared/LoadingButton';

export function ProfileScreen() {
  const { 
    user, 
    logout, 
    biometricAvailable, 
    biometricEnabled, 
    biometricType,
    disableBiometric 
  } = useAuth();

  const { syncDevices, isLoading, error, lastSync } = useDevices();

  const handleToggleBiometric = async () => {
    if (biometricEnabled) {
      await disableBiometric();
    }
  };

  const handleSyncDevices = async () => {
    const success = await syncDevices();
    
    if (success) {
      const bleScanner = BleScanner.getInstance();
      await bleScanner.reloadAuthorizedDevices();
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <VStack className="flex-1 px-4 pt-4 bg-background-0">

        <UserInfoCard user={user} />

        <DeviceSyncCard
          lastSync={lastSync}
          isLoading={isLoading}
          error={error}
          onSync={handleSyncDevices}
        />

        {biometricAvailable && (
          <BiometricSettingsCard
            biometricType={'Biometría'}
            biometricEnabled={biometricEnabled}
            onToggle={handleToggleBiometric}
          />
        )}

        <LoadingButton
          onPress={logout}
          variant="danger"
          className="mt-auto mb-4"
        >
          Cerrar Sesión
        </LoadingButton>
      </VStack>
    </SafeAreaView>
  );
}
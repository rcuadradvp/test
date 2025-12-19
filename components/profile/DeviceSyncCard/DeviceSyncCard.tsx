// components/profile/DeviceSyncCard/DeviceSyncCard.tsx
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react-native';
import { LoadingButton } from '@/components/shared/LoadingButton';

interface DeviceSyncCardProps {
  lastSync: Date | null;
  isLoading: boolean;
  error: string | null;
  onSync: () => void;
}

export function DeviceSyncCard({
  lastSync,
  isLoading,
  error,
  onSync,
}: DeviceSyncCardProps) {
  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <Box className="bg-background-50 rounded-xl p-5 mb-4">
      <VStack className="gap-4">
        <VStack className="gap-2">
          <HStack className="items-center gap-2">
            <Icon 
              as={RefreshCw} 
              size="sm" 
              className="text-typography-700"
            />
            <Text className="font-semibold text-typography-900">
              Dispositivos Autorizados
            </Text>
          </HStack>

          <HStack className="items-center gap-2">
            <Text size="sm" className="text-typography-500">
              Última sincronización: {formatLastSync(lastSync)}
            </Text>
          </HStack>
        </VStack>

        <LoadingButton
          onPress={onSync}
          isLoading={isLoading}
          variant="primary"
        >
          {isLoading ? 'Sincronizando...' : 'Sincronizar Dispositivos'}
        </LoadingButton>

        {error && (
          <HStack className="items-center gap-2 bg-error-50 p-3 rounded-lg">
            <Icon as={AlertCircle} size="sm" className="text-error-600" />
            <Text size="sm" className="text-error-600 flex-1">
              {error}
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
  );
}
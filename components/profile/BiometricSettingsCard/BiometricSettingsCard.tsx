// components/profile/BiometricSettingsCard/BiometricSettingsCard.tsx
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/icon';
import { Fingerprint, CheckCircle, XCircle } from 'lucide-react-native';

interface BiometricSettingsCardProps {
  biometricType: string;
  biometricEnabled: boolean;
  onToggle: () => void;
}

export function BiometricSettingsCard({
  biometricType,
  biometricEnabled,
  onToggle,
}: BiometricSettingsCardProps) {
  return (
    <Box className="bg-background-50 rounded-xl p-5 mb-4">
      <HStack className="items-center justify-between">
        <HStack className="items-center gap-3 flex-1">
          <VStack className="flex-1">
            <Text className="font-semibold text-typography-900">
              Iniciar con {biometricType}
            </Text>
            <HStack className="items-center gap-2 mt-1">
              <Text size="sm" className="text-typography-500 flex-1">
                {biometricEnabled 
                  ? 'Activo - Puedes usar biometría para iniciar sesión'
                  : 'Inactivo - Inicia sesión con credenciales para activar'}
              </Text>
            </HStack>
          </VStack>
        </HStack>
        <Switch
          value={biometricEnabled}
          onValueChange={onToggle}
          isDisabled={!biometricEnabled}
        />
      </HStack>
    </Box>
  );
}
// components/auth/BiometricButton/BiometricButton.tsx
import { LoadingButton } from '@/components/shared/LoadingButton';

interface BiometricButtonProps {
  onPress: () => void;
  isLoading: boolean;
  biometricType: string;
}

export function BiometricButton({
  onPress,
  isLoading,
  biometricType,
}: BiometricButtonProps) {
  return (
    <LoadingButton
      onPress={onPress}
      isLoading={isLoading}
      variant="primary"
    >
      Biometría
    </LoadingButton>
  );
}
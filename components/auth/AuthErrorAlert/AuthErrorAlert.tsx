// components/auth/AuthErrorAlert/AuthErrorAlert.tsx
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

interface AuthErrorAlertProps {
  error: string | null;
}

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
  if (!error) return null;

  return (
    <Box className="bg-error-100 p-3 rounded-lg">
      <Text className="text-error-600 text-center">{error}</Text>
    </Box>
  );
}
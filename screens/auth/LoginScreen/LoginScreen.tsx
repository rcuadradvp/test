// screens/auth/LoginScreen/LoginScreen.tsx
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { LoginForm } from '@/components/auth/LoginForm';
import { BiometricButton } from '@/components/auth/BiometricButton';
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert';
import type { LoginCredentials } from '@/types';

export function LoginScreen() {
  const {
    login,
    loginWithBiometric,
    isLoading,
    error,
    clearError,
    biometricEnabled,
    biometricType,
    isAuthenticated,
    shouldPromptBiometric,
    clearBiometricPrompt,
  } = useAuth();

  const biometricAttempted = useRef(false);

  useEffect(() => {
    if (
      biometricEnabled &&
      !biometricAttempted.current &&
      !isAuthenticated &&
      shouldPromptBiometric
    ) {
      biometricAttempted.current = true;
      handleBiometricLogin();
    }
  }, [biometricEnabled, isAuthenticated, shouldPromptBiometric]);

  useEffect(() => {
    return () => {
      biometricAttempted.current = false;
    };
  }, []);

  const handleLogin = async (credentials: LoginCredentials) => {
    clearBiometricPrompt();
    await login(credentials);
  };

  const handleBiometricLogin = async () => {
    const success = await loginWithBiometric();
    if (!success) {
      console.log('[Login] Biometric failed, user can enter password');
    }
  };

  const handleInputChange = () => {
    clearError();
  };

  return (
    <Box className="flex-1 justify-center px-6 bg-white">
      <VStack className="gap-8">
        <Heading size="3xl" className="text-center">
          Iniciar Sesión
        </Heading>

        <AuthErrorAlert error={error} />

        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          onInputChange={handleInputChange}
        />

                {biometricEnabled && (

          
          <VStack className="gap-6">
                        <HStack className="items-center gap-4">
              <Divider className="flex-1" />
              <Text className="text-typography-500">O Ingresar con</Text>
              <Divider className="flex-1" />
            </HStack>
            <BiometricButton
              onPress={handleBiometricLogin}
              isLoading={isLoading}
              biometricType={biometricType || 'Biometría'}
            />
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
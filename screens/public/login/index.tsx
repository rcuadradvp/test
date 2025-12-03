import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthContext();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });

  const handleLogin = async () => {
    // Limpiar errores previos
    clearError();
    setFieldErrors({ username: '', password: '' });

    // Validaciones básicas
    if (!username.trim()) {
      setFieldErrors(prev => ({ ...prev, username: 'El usuario es requerido' }));
      return;
    }
    if (!password.trim()) {
      setFieldErrors(prev => ({ ...prev, password: 'La contraseña es requerida' }));
      return;
    }

    // Intentar login
    const success = await login(username, password);
    
    if (success) {
      // Redirigir al dashboard
      router.replace('/(app)/(tabs)/dashboard');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="bg-background-0"
      >
        <View className="flex-1">
          {/* Theme Toggle en la esquina superior derecha */}
          <View className="absolute top-12 right-6 z-10">
            <ThemeToggle />
          </View>

          <Box className="flex-1 justify-center p-6">
            <VStack space="xl" className="w-full max-w-md mx-auto">
              {/* Header */}
              <VStack space="sm">
                <Heading size="2xl" className="text-typography-900">
                  Iniciar Sesión
                </Heading>
                <Text size="md" className="text-typography-500 ">
                  Ingresa tus credenciales para continuar
                </Text>
              </VStack>

              {/* Form */}
              <VStack space="lg">
                {/* Username */}
                <FormControl isInvalid={!!fieldErrors.username}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 ">
                      Usuario o Email
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 border-outline-200 ">
                    <InputField
                      placeholder="usuario@ejemplo.com"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      className="text-typography-900"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                  {fieldErrors.username ? (
                    <FormControlError>
                      <FormControlErrorText>{fieldErrors.username}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </FormControl>

                {/* Password */}
                <FormControl isInvalid={!!fieldErrors.password}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 ">
                      Contraseña
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 border-outline-200 ">
                    <InputField
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      className="text-typography-900"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                  {fieldErrors.password ? (
                    <FormControlError>
                      <FormControlErrorText>{fieldErrors.password}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </FormControl>

                {/* Error del servidor */}
                {error ? (
                  <Box className="bg-error-50 p-3 rounded-lg border border-error-200">
                    <Text size="sm" className="text-error-700">
                      {error}
                    </Text>
                  </Box>
                ) : null}

                {/* Botón de Login */}
                <Button
                  size="lg"
                  onPress={handleLogin}
                  isDisabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <ButtonSpinner />
                      <ButtonText>Iniciando...</ButtonText>
                    </>
                  ) : (
                    <ButtonText>Iniciar Sesión</ButtonText>
                  )}
                </Button>
              </VStack>

                            {/* Divider */}
              <HStack className="items-center" space="md">
                <Divider className="flex-1 bg-outline-200 " />
                <Text size="sm" className="text-typography-400 ">
                  o continúa con estas opciones si ya la has vinculado
                </Text>
                <Divider className="flex-1 bg-outline-200 " />
              </HStack>

              {/* OAuth Buttons */}
              <OAuthButtons />


              {/* Links */}
              <VStack space="md" className="items-center">
                <Link href="/(public)/register">
                  <Text size="sm" className="text-primary-600">
                    ¿No tienes cuenta? Regístrate
                  </Text>
                </Link>
                
              </VStack>
            </VStack>
          </Box>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
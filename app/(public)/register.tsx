import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { FormControl, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Pantalla de Registro
 * TODO: Conectar con endpoint de registro cuando esté disponible
 */
export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    // TODO: Implementar lógica de registro
    console.log('Registro:', { name, email, password });
    alert('Función de registro en desarrollo');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="bg-background-0 dark:bg-background-950"
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
                <Heading size="2xl" className="text-typography-900 dark:text-typography-50">
                  Crear Cuenta
                </Heading>
                <Text size="md" className="text-typography-500 dark:text-typography-400">
                  Completa tus datos para comenzar
                </Text>
              </VStack>

              {/* Form */}
              <VStack space="lg">
                {/* Name */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 dark:text-typography-300">
                      Nombre Completo
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 dark:bg-background-900 border-outline-200 dark:border-outline-700">
                    <InputField
                      placeholder="Juan Pérez"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      className="text-typography-900 dark:text-typography-50"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                </FormControl>

                {/* Email */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 dark:text-typography-300">
                      Email
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 dark:bg-background-900 border-outline-200 dark:border-outline-700">
                    <InputField
                      placeholder="usuario@ejemplo.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      className="text-typography-900 dark:text-typography-50"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                </FormControl>

                {/* Password */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 dark:text-typography-300">
                      Contraseña
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 dark:bg-background-900 border-outline-200 dark:border-outline-700">
                    <InputField
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      className="text-typography-900 dark:text-typography-50"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                </FormControl>

                {/* Confirm Password */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-700 dark:text-typography-300">
                      Confirmar Contraseña
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input className="bg-background-50 dark:bg-background-900 border-outline-200 dark:border-outline-700">
                    <InputField
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      className="text-typography-900 dark:text-typography-50"
                      placeholderTextColor="#9CA3AF"
                    />
                  </Input>
                </FormControl>

                {/* Register Button */}
                <Button size="lg" onPress={handleRegister}>
                  <ButtonText>Crear Cuenta</ButtonText>
                </Button>
              </VStack>

              {/* Links */}
              <VStack space="md" className="items-center">
                <Link href="/(public)/login">
                  <Text size="sm" className="text-primary-600 dark:text-primary-400">
                    ¿Ya tienes cuenta? Inicia sesión
                  </Text>
                </Link>
                
                <Link href="/(public)">
                  <Text size="sm" className="text-typography-500 dark:text-typography-400">
                    ← Volver al inicio
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
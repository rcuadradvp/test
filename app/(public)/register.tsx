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
      >
        <View className="flex-1 bg-white">
          <Box className="flex-1 justify-center p-6">
            <VStack space="xl" className="w-full max-w-md mx-auto">
              {/* Header */}
              <VStack space="sm">
                <Heading size="2xl">Crear Cuenta</Heading>
                <Text size="md" className="text-typography-500">
                  Completa tus datos para comenzar
                </Text>
              </VStack>

              {/* Form */}
              <VStack space="lg">
                {/* Name */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Nombre Completo</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      placeholder="Juan Pérez"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </Input>
                </FormControl>

                {/* Email */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Email</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      placeholder="usuario@ejemplo.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </Input>
                </FormControl>

                {/* Password */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Contraseña</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </Input>
                </FormControl>

                {/* Confirm Password */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Confirmar Contraseña</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
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
                  <Text size="sm" className="text-primary-600">
                    ¿Ya tienes cuenta? Inicia sesión
                  </Text>
                </Link>
                
                <Link href="/(public)">
                  <Text size="sm" className="text-typography-500">
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

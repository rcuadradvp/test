// components/auth/LoginForm/LoginForm.tsx
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { FormControl } from '@/components/ui/form-control';
import { VStack } from '@/components/ui/vstack';
import { InputIcon } from '@/components/ui/input';
import { FormInput } from '@/components/shared/FormInput';
import { LoadingButton } from '@/components/shared/LoadingButton';
import type { LoginCredentials } from '@/types';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  isLoading: boolean;
  onInputChange?: () => void;
}

export function LoginForm({
  onSubmit,
  isLoading,
  onInputChange,
}: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    onInputChange?.();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    onInputChange?.();
  };

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) return;
    onSubmit({
      username: username.trim(),
      password,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <FormControl>
      <VStack className="gap-6">
        <FormInput
          label="Usuario"
          value={username}
          onChangeText={handleUsernameChange}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          isDisabled={isLoading}
        />

        <FormInput
          label="Contraseña"
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="••••••••"
          type={showPassword ? 'text' : 'password'}
          isDisabled={isLoading}
          rightIcon={
            <InputIcon
              as={showPassword ? Eye : EyeOff}
              className="text-typography-500"
            />
          }
          onRightIconPress={togglePasswordVisibility}
        />

        <LoadingButton
          onPress={handleSubmit}
          isLoading={isLoading}
          variant="primary"
        >
          Ingresar
        </LoadingButton>
      </VStack>
    </FormControl>
  );
}
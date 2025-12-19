// components/shared/FormInput/FormInput.tsx
import { ReactNode } from 'react';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  isDisabled?: boolean;
  error?: string;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  type = 'text',
  autoCapitalize = 'none',
  keyboardType = 'default',
  isDisabled = false,
  error,
  rightIcon,
  onRightIconPress,
}: FormInputProps) {
  return (
    <VStack className="gap-2">
      <Text className="text-sm font-medium text-typography-700">
        {label}
      </Text>
      <Input>
        <InputField
          type={type}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={!isDisabled}
        />
        {rightIcon && (
          <InputSlot className="pr-3" onPress={onRightIconPress}>
            {rightIcon}
          </InputSlot>
        )}
      </Input>
      {error && (
        <Text className="text-sm text-error-500">{error}</Text>
      )}
    </VStack>
  );
}
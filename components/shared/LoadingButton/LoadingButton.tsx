// components/shared/LoadingButton/LoadingButton.tsx
import { ActivityIndicator } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';

interface LoadingButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export function LoadingButton({
  onPress,
  isLoading = false,
  isDisabled = false,
  children,
  variant = 'primary',
  className,
}: LoadingButtonProps) {
  const getVariantClass = () => {
    if (isLoading || isDisabled) return 'bg-gray-400';
    
    switch (variant) {
      case 'danger':
        return 'bg-error-500 active:bg-error-600';
      case 'secondary':
        return 'bg-secondary-500 active:bg-secondary-600';
      default:
        return 'bg-primary-500 active:bg-primary-600';
    }
  };

  const buttonClassName = className 
    ? `${getVariantClass()} ${className}`  
    : getVariantClass();

  return (
    <Button
      className={buttonClassName}
      onPress={onPress}
      isDisabled={isLoading || isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <ButtonText>{children}</ButtonText>
      )}
    </Button>
  );
}
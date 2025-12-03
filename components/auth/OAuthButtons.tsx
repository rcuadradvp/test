import { Platform } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/config/supabase.config';
import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { GoogleIcon } from '@/assets/svg/Google';

export function OAuthButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleOAuth = async (provider: 'google' | 'github' | 'apple') => {
    try {
      setLoading(provider);
      setError('');

      const redirectTo = Platform.OS === 'web' 
        ? window.location.origin 
        : 'myapp://auth-callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;
      
    } catch (err: any) {
      console.error(`Error with ${provider} OAuth:`, err);
      setError(err.message || `Error al iniciar sesión con ${provider}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <VStack space="md" className="w-full">
      <Button
        variant="outline"
        size="lg"
        onPress={() => handleOAuth('google')}
        isDisabled={loading !== null}
      >
        <HStack space="sm" className="items-center">
          <GoogleIcon />
          <ButtonText>
            {loading === 'google' ? 'Conectando...' : 'Continuar con Google'}
          </ButtonText>
        </HStack>
      </Button>

      {error && (
        <Text className="text-sm text-error-600 text-center">
          {error}
        </Text>
      )}
    </VStack>
  );
}

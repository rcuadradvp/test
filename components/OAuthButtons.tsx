import { Pressable, Platform } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Github } from 'lucide-react-native';
import { supabase } from '@/config/supabase.config';
import { useState } from 'react';
import { Text } from '@/components/ui/text';

/**
 * Componente de botones OAuth
 * Soporta Google, GitHub y Apple
 */
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

      // En web, Supabase redirige automáticamente
      // En mobile, necesitas manejar el deep link
      
    } catch (err: any) {
      console.error(`Error with ${provider} OAuth:`, err);
      setError(err.message || `Error al iniciar sesión con ${provider}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <VStack space="md" className="w-full">
      {/* Google */}
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

      {/* GitHub */}
      <Button
        variant="outline"
        size="lg"
        onPress={() => handleOAuth('github')}
        isDisabled={loading !== null}
      >
        <HStack space="sm" className="items-center">
          <Icon as={Github} size="sm" />
          <ButtonText>
            {loading === 'github' ? 'Conectando...' : 'Continuar con GitHub'}
          </ButtonText>
        </HStack>
      </Button>

      {/* Apple (solo en iOS/Mac) */}
      {(Platform.OS === 'ios' || Platform.OS === 'macos') && (
        <Button
          variant="outline"
          size="lg"
          onPress={() => handleOAuth('apple')}
          isDisabled={loading !== null}
          className="bg-black border-black"
        >
          <HStack space="sm" className="items-center">
            <AppleIcon />
            <ButtonText className="text-white">
              {loading === 'apple' ? 'Conectando...' : 'Continuar con Apple'}
            </ButtonText>
          </HStack>
        </Button>
      )}

      {error && (
        <Text className="text-sm text-error-600 text-center">
          {error}
        </Text>
      )}
    </VStack>
  );
}

// Google Icon SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Apple Icon SVG
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
      <path d="M15.5 14.625c-.563 1.312-1.313 2.375-2.25 3.188-.937.812-1.75 1.187-2.437 1.187-.5 0-1.125-.125-1.875-.375-.75-.25-1.438-.375-2.063-.375-.625 0-1.312.125-2.062.375-.75.25-1.375.375-1.875.375-.687 0-1.5-.375-2.438-1.125C.563 17.063 0 15.938 0 14.438c0-1.5.375-2.75 1.125-3.75.75-1 1.688-1.5 2.813-1.5.625 0 1.375.188 2.25.563.875.374 1.437.562 1.687.562.188 0 .75-.188 1.688-.563.937-.374 1.75-.562 2.437-.562 1.188 0 2.188.5 3 1.5.5.437.938 1 1.312 1.687-.5.313-.937.688-1.312 1.125-.375.438-.562.938-.562 1.5 0 .625.187 1.188.562 1.688.375.5.813.875 1.313 1.125-.188.5-.438 1-.75 1.5zM11.625 0c0 .5-.125 1-.375 1.5-.25.5-.625.938-1.125 1.313-.5.374-1 .562-1.5.562-.063 0-.125-.063-.188-.188-.062-.124-.093-.312-.093-.562 0-.5.125-1 .375-1.5.25-.5.625-.938 1.125-1.313C10.375.438 10.875.25 11.375.188c.063 0 .125.062.188.187.062.125.093.313.093.563.125 0 .063 0 .063.062z" />
    </svg>
  );
}

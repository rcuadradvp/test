import { View, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { Icon } from '@/components/ui/icon';
import { Edit2, Camera, Save, X } from 'lucide-react-native';
import { useState } from 'react';
import { supabase } from '@/config/supabase.config';
import * as ImagePicker from 'expo-image-picker';

/**
 * Pantalla de Perfil
 * Con edición inline, cambio de contraseña y upload de avatar
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { userLogged, logout, loadUserProfile } = useAuthContext();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile edit state
  const [editName, setEditName] = useState(userLogged?.name || '');
  const [editEmail, setEditEmail] = useState(userLogged?.email || '');
  
  // Password edit state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(public)');
            },
          },
        ]
      );
      return;
    }
    
    await logout();
    router.replace('/(public)');
  };

  // Editar perfil
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!editName.trim()) {
        setError('El nombre es requerido');
        return;
      }

      // Actualizar en Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: editName.trim(),
          email: editEmail.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userLogged?.userId);

      if (updateError) throw updateError;

      // Recargar perfil
      await loadUserProfile();
      
      setIsEditingProfile(false);
      
      if (Platform.OS === 'web') {
        alert('Perfil actualizado correctamente');
      } else {
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!newPassword || !confirmPassword) {
        setError('Todos los campos son requeridos');
        return;
      }

      if (newPassword.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }

      // Actualizar contraseña en Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Limpiar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditingPassword(false);

      if (Platform.OS === 'web') {
        alert('Contraseña cambiada correctamente');
      } else {
        Alert.alert('Éxito', 'Contraseña cambiada correctamente');
      }
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload avatar (preparado para implementación futura)
  const handleUploadAvatar = async () => {
    try {
      // Pedir permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería');
        return;
      }

      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        // Aquí implementarías la subida a Supabase Storage
        Alert.alert('Próximamente', 'Función de subida de avatar en desarrollo');
        // const avatarUrl = await uploadToSupabase(result.assets[0].uri);
        // await updateProfileAvatar(avatarUrl);
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      Alert.alert('Error', 'No se pudo subir la imagen');
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-0">
      <Box className="p-6">
        <VStack space="xl">
          {/* Header */}
          <HStack className="justify-between items-center">
            <Heading size="2xl">Perfil</Heading>
            {!isEditingProfile && !isEditingPassword && (
              <Pressable onPress={() => setIsEditingProfile(true)}>
                <Icon as={Edit2} size="sm" className="text-primary-600" />
              </Pressable>
            )}
          </HStack>

          {/* User Info Card */}
          <Card className="p-6">
            <VStack space="lg" className="items-center">
              {/* Avatar con botón de cambio */}
              <Box className="relative">
                <Avatar size="xl" className="bg-primary-500">
                  <AvatarFallbackText>
                    {userLogged?.name || 'User'}
                  </AvatarFallbackText>
                </Avatar>
                <Pressable
                  onPress={handleUploadAvatar}
                  className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-2"
                >
                  <Icon as={Camera} size="xs"/>
                </Pressable>
              </Box>

              {/* Modo Edición */}
              {isEditingProfile ? (
                <VStack space="md" className="w-full">
                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText>Nombre</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Tu nombre"
                      />
                    </Input>
                  </FormControl>

                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText>Email</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="tu@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </Input>
                  </FormControl>

                  {error && (
                    <Box className="bg-error-50 p-3 rounded-lg">
                      <Text className="text-error-700 text-sm">{error}</Text>
                    </Box>
                  )}

                  <HStack space="sm">
                    <Button
                      className="flex-1"
                      variant="solid"
                      onPress={handleSaveProfile}
                      isDisabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <ButtonSpinner />
                          <ButtonText>Guardando...</ButtonText>
                        </>
                      ) : (
                        <>
                          <Icon as={Save} size="sm" className="mr-2" />
                          <ButtonText>Guardar</ButtonText>
                        </>
                      )}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onPress={() => {
                        setIsEditingProfile(false);
                        setEditName(userLogged?.name || '');
                        setEditEmail(userLogged?.email || '');
                        setError('');
                      }}
                      isDisabled={isLoading}
                    >
                      <Icon as={X} size="sm" className="text-typography-600 mr-2" />
                      <ButtonText>Cancelar</ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <>
                  {/* Name & Email */}
                  <VStack space="xs" className="items-center">
                    <Heading size="xl">{userLogged?.name}</Heading>
                    <Text size="md" className="text-typography-500">
                      {userLogged?.email}
                    </Text>
                  </VStack>

                  <Divider className="w-full" />

                  {/* User Details */}
                  <VStack space="md" className="w-full">
                    <HStack className="justify-between">
                      <Text size="sm" className="text-typography-500">
                        ID de Usuario
                      </Text>
                      <Text size="sm" className="font-semibold">
                        {userLogged?.userId?.slice(0, 8)}...
                      </Text>
                    </HStack>

                    <HStack className="justify-between">
                      <Text size="sm" className="text-typography-500">
                        Rol
                      </Text>
                      <Text size="sm" className="font-semibold">
                        {userLogged?.role}
                      </Text>
                    </HStack>

                    {userLogged?.customRole && (
                      <HStack className="justify-between">
                        <Text size="sm" className="text-typography-500">
                          Rol Personalizado
                        </Text>
                        <Text size="sm" className="font-semibold">
                          {userLogged.customRole}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </>
              )}
            </VStack>
          </Card>

          {/* Company Info Card */}
          {!isEditingProfile && !isEditingPassword && (
            <Card className="p-6">
              <VStack space="md">
                <Heading size="lg">Información de Empresa</Heading>
                
                <VStack space="sm">
                  <HStack className="justify-between">
                    <Text size="sm" className="text-typography-500">
                      Empresa
                    </Text>
                    <Text size="sm" className="font-semibold">
                      {userLogged?.companyName}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text size="sm" className="text-typography-500">
                      ID de Empresa
                    </Text>
                    <Text size="sm" className="font-semibold">
                      {userLogged?.companyId?.slice(0, 8)}...
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text size="sm" className="text-typography-500">
                      Estado
                    </Text>
                    <Box
                      className={`px-2 py-1 rounded ${
                        userLogged?.companyActive
                          ? 'bg-success-100'
                          : 'bg-error-100'
                      }`}
                    >
                      <Text
                        size="xs"
                        className={
                          userLogged?.companyActive
                            ? 'text-success-700'
                            : 'text-error-700'
                        }
                      >
                        {userLogged?.companyActive ? 'Activa' : 'Inactiva'}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </VStack>
            </Card>
          )}

          {/* Change Password Card */}
          {isEditingPassword ? (
            <Card className="p-6">
              <VStack space="md">
                <Heading size="lg">Cambiar Contraseña</Heading>

                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Nueva Contraseña</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Mínimo 6 caracteres"
                      secureTextEntry
                    />
                  </Input>
                </FormControl>

                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Confirmar Contraseña</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repite la contraseña"
                      secureTextEntry
                    />
                  </Input>
                </FormControl>

                {error && (
                  <Box className="bg-error-50 p-3 rounded-lg">
                    <Text className="text-error-700 text-sm">{error}</Text>
                  </Box>
                )}

                <HStack space="sm">
                  <Button
                    className="flex-1"
                    variant="solid"
                    onPress={handleChangePassword}
                    isDisabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <ButtonSpinner />
                        <ButtonText>Cambiando...</ButtonText>
                      </>
                    ) : (
                      <ButtonText>Cambiar Contraseña</ButtonText>
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onPress={() => {
                      setIsEditingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                    }}
                    isDisabled={isLoading}
                  >
                    <ButtonText>Cancelar</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Card>
          ) : null}

          {/* Permissions Card */}
          {!isEditingProfile && !isEditingPassword && userLogged?.paths && userLogged.paths.length > 0 && (
            <Card className="p-6">
              <VStack space="md">
                <Heading size="lg">Permisos</Heading>
                <VStack space="xs">
                  {userLogged.paths.map((path, index) => (
                    <HStack key={index} space="sm" className="items-center">
                      <Box className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      <Text size="sm">{path}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </Card>
          )}

          {/* Actions */}
          {!isEditingProfile && !isEditingPassword && (
            <VStack space="md">
              <Button
                variant="outline"
                size="lg"
                onPress={() => setIsEditingProfile(true)}
              >
                <Icon as={Edit2} size="sm" className="text-primary-600 mr-2" />
                <ButtonText>Editar Perfil</ButtonText>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onPress={() => setIsEditingPassword(true)}
              >
                <ButtonText>Cambiar Contraseña</ButtonText>
              </Button>

              <Button
                variant="solid"
                action="negative"
                size="lg"
                onPress={handleLogout}
              >
                <ButtonText>Cerrar Sesión</ButtonText>
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </ScrollView>
  );
}

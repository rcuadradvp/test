import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold mb-2">¡Bienvenido!</Text>

        <Text className="text-xl text-gray-600 mb-8">{user?.name}</Text>

        <View className="bg-gray-100 p-4 rounded-lg w-full mb-8">
          <Text className="text-sm text-gray-500 mb-1">Email:</Text>
          <Text className="text-base mb-3">{user?.email}</Text>

          <Text className="text-sm text-gray-500 mb-1">Rol:</Text>
          <Text className="text-base mb-3">{user?.role}</Text>

          <Text className="text-sm text-gray-500 mb-1">Empresa:</Text>
          <Text className="text-base">{user?.companyName}</Text>
        </View>

        <Pressable
          className="bg-red-500 active:bg-red-600 rounded-lg py-4 px-8"
          onPress={logout}
        >
          <Text className="text-white font-semibold text-base">
            Cerrar Sesión
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
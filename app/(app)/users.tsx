import { View, ScrollView, RefreshControl, Pressable, Alert, Platform, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { 
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.config';
import { useAuthContext } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  company_name: string;
  company_active: boolean;
  custom_role: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
};

type UserStats = {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  users: number;
};

/**
 * Pantalla de Administración de Usuarios
 * Solo para admins
 */
export default function UsersScreen() {
  const { userLogged } = useAuthContext();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');

  // Verificar que el usuario sea admin
  if (userLogged?.role !== 'admin') {
    return (
      <View className="flex-1 bg-background-0 items-center justify-center p-6">
        <Icon as={Shield} size="xl" className="text-error-500 mb-4" />
        <Heading size="xl" className="text-center mb-2">Acceso Denegado</Heading>
        <Text className="text-center text-typography-500">
          Esta sección es solo para administradores
        </Text>
      </View>
    );
  }

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filterStatus, filterRole]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('get_all_users');

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_stats');

      if (error) throw error;

      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.company_name.toLowerCase().includes(query)
      );
    }

    // Filtro de estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter((user) =>
        filterStatus === 'active' ? user.company_active : !user.company_active
      );
    }

    // Filtro de rol
    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'desactivar' : 'activar';
      const confirmMessage = `¿Estás seguro que deseas ${action} este usuario?`;

      if (Platform.OS === 'web') {
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) return;
      } else {
        Alert.alert(
          `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
          confirmMessage,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Confirmar',
              onPress: async () => {
                await toggleStatus(userId, currentStatus);
              },
            },
          ]
        );
        return;
      }

      await toggleStatus(userId, currentStatus);
    } catch (error: any) {
      console.error('Error toggling status:', error);
      Alert.alert('Error', error.message);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    const rpcFunction = currentStatus ? 'deactivate_user' : 'activate_user';

    const { error } = await supabase.rpc(rpcFunction, {
      p_user_id: userId,
    });

    if (error) throw error;

    // Actualizar localmente
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, company_active: !currentStatus } : user
      )
    );

    loadStats();
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMessage = `¿Cambiar rol a ${newRole}?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Cambiar Rol',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await changeRole(userId, newRole);
            },
          },
        ]
      );
      return;
    }

    await changeRole(userId, newRole);
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_role: newRole,
      });

      if (error) throw error;

      // Actualizar localmente
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      loadStats();
    } catch (error: any) {
      console.error('Error changing role:', error);
      Alert.alert('Error', error.message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    try {
      return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen
        options={{
          title: 'Usuarios',
          headerShown: true,
          headerBackTitle: 'Atrás',
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadUsers} />
        }
      >
        <Box className="p-6">
          <VStack space="lg">
            {/* Header */}
            <HStack className="justify-between items-center">
              <VStack>
                <Heading size="2xl">Usuarios</Heading>
                <Text className="text-typography-500">
                  Administra los usuarios del sistema
                </Text>
              </VStack>
            </HStack>

            {/* Stats Cards */}
            {stats && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack space="md">
                  <Card className="p-4 min-w-[140px]">
                    <VStack space="xs">
                      <Text size="sm" className="text-typography-500">
                        Total
                      </Text>
                      <Heading size="2xl">{stats.total}</Heading>
                    </VStack>
                  </Card>

                  <Card className="p-4 min-w-[140px] bg-success-50">
                    <VStack space="xs">
                      <Text size="sm" className="text-success-700">
                        Activos
                      </Text>
                      <Heading size="2xl" className="text-success-700">
                        {stats.active}
                      </Heading>
                    </VStack>
                  </Card>

                  <Card className="p-4 min-w-[140px] bg-error-50">
                    <VStack space="xs">
                      <Text size="sm" className="text-error-700">
                        Inactivos
                      </Text>
                      <Heading size="2xl" className="text-error-700">
                        {stats.inactive}
                      </Heading>
                    </VStack>
                  </Card>

                  <Card className="p-4 min-w-[140px] bg-primary-50">
                    <VStack space="xs">
                      <Text size="sm" className="text-primary-700">
                        Admins
                      </Text>
                      <Heading size="2xl" className="text-primary-700">
                        {stats.admins}
                      </Heading>
                    </VStack>
                  </Card>
                </HStack>
              </ScrollView>
            )}

            {/* Search & Filters */}
            <VStack space="md">
              {/* Search */}
              <Box className="flex-row items-center bg-background-50 rounded-lg px-4 py-2">
                <Icon as={Search} size="sm" className="text-typography-400 mr-2" />
                <TextInput
                  className="flex-1 text-typography-900"
                  placeholder="Buscar por nombre, email o empresa..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
              </Box>

              {/* Filters */}
              <HStack space="sm">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack space="sm">
                    {/* Status Filter */}
                    <Pressable
                      onPress={() =>
                        setFilterStatus((prev) =>
                          prev === 'all' ? 'active' : prev === 'active' ? 'inactive' : 'all'
                        )
                      }
                      className={`px-4 py-2 rounded-lg ${
                        filterStatus !== 'all' ? 'bg-primary-500' : 'bg-background-100'
                      }`}
                    >
                      <Text
                        className={
                          filterStatus !== 'all' ? 'text-white font-medium' : 'text-typography-600'
                        }
                      >
                        {filterStatus === 'all' ? 'Todos' : filterStatus === 'active' ? 'Activos' : 'Inactivos'}
                      </Text>
                    </Pressable>

                    {/* Role Filter */}
                    <Pressable
                      onPress={() =>
                        setFilterRole((prev) =>
                          prev === 'all' ? 'admin' : prev === 'admin' ? 'user' : 'all'
                        )
                      }
                      className={`px-4 py-2 rounded-lg ${
                        filterRole !== 'all' ? 'bg-primary-500' : 'bg-background-100'
                      }`}
                    >
                      <Text
                        className={
                          filterRole !== 'all' ? 'text-white font-medium' : 'text-typography-600'
                        }
                      >
                        {filterRole === 'all' ? 'Todos los roles' : filterRole === 'admin' ? 'Admins' : 'Users'}
                      </Text>
                    </Pressable>
                  </HStack>
                </ScrollView>
              </HStack>
            </VStack>

            {/* Users List */}
            <VStack space="md">
              {filteredUsers.length === 0 ? (
                <Card className="p-12">
                  <VStack space="md" className="items-center">
                    <Icon as={Users} size="xl" className="text-typography-300" />
                    <VStack space="xs" className="items-center">
                      <Heading size="md" className="text-typography-600">
                        No se encontraron usuarios
                      </Heading>
                      <Text className="text-typography-400 text-center">
                        {searchQuery || filterStatus !== 'all' || filterRole !== 'all'
                          ? 'Intenta con otros filtros'
                          : 'Aún no hay usuarios registrados'}
                      </Text>
                    </VStack>
                  </VStack>
                </Card>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <VStack space="md">
                      {/* User Info */}
                      <HStack className="justify-between items-start">
                        <VStack className="flex-1">
                          <HStack space="sm" className="items-center">
                            <Heading size="md">{user.name}</Heading>
                            {user.role === 'admin' && (
                              <Box className="bg-primary-100 px-2 py-0.5 rounded">
                                <Text size="xs" className="text-primary-700 font-medium">
                                  Admin
                                </Text>
                              </Box>
                            )}
                            <Box
                              className={`px-2 py-0.5 rounded ${
                                user.company_active ? 'bg-success-100' : 'bg-error-100'
                              }`}
                            >
                              <Text
                                size="xs"
                                className={
                                  user.company_active ? 'text-success-700' : 'text-error-700'
                                }
                              >
                                {user.company_active ? 'Activo' : 'Inactivo'}
                              </Text>
                            </Box>
                          </HStack>

                          <Text size="sm" className="text-typography-500 mt-1">
                            {user.email}
                          </Text>

                          <Text size="sm" className="text-typography-400 mt-1">
                            {user.company_name}
                          </Text>

                          <Text size="xs" className="text-typography-400 mt-2">
                            Último acceso: {formatDate(user.last_sign_in_at)}
                          </Text>
                        </VStack>
                      </HStack>

                      {/* Actions */}
                      {user.id !== userLogged?.userId && (
                        <HStack space="sm">
                          <Pressable
                            onPress={() => handleChangeRole(user.id, user.role)}
                            className="flex-1 flex-row items-center justify-center px-3 py-2 bg-primary-50 rounded-lg"
                          >
                            <Icon as={ShieldCheck} size="xs" className="text-primary-600 mr-1" />
                            <Text size="sm" className="text-primary-600 font-medium">
                              {user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleToggleStatus(user.id, user.company_active)}
                            className={`flex-1 flex-row items-center justify-center px-3 py-2 rounded-lg ${
                              user.company_active ? 'bg-error-50' : 'bg-success-50'
                            }`}
                          >
                            <Icon
                              as={user.company_active ? UserX : UserCheck}
                              size="xs"
                              className={user.company_active ? 'text-error-600 mr-1' : 'text-success-600 mr-1'}
                            />
                            <Text
                              size="sm"
                              className={
                                user.company_active
                                  ? 'text-error-600 font-medium'
                                  : 'text-success-600 font-medium'
                              }
                            >
                              {user.company_active ? 'Desactivar' : 'Activar'}
                            </Text>
                          </Pressable>
                        </HStack>
                      )}

                      {user.id === userLogged?.userId && (
                        <Box className="bg-info-50 p-2 rounded">
                          <Text size="xs" className="text-info-700 text-center">
                            Este eres tú
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Card>
                ))
              )}
            </VStack>
          </VStack>
        </Box>
      </ScrollView>
    </View>
  );
}

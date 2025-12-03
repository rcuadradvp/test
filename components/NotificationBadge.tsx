import { Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '@/context/NotificationsContext';

type NotificationBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
};

export function NotificationBadge({ size = 'md', showCount = true }: NotificationBadgeProps) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  const handlePress = () => {
    router.push('/(app)/notifications' as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="relative p-2 rounded-lg hover:bg-background-100 active:bg-background-200"
      accessibilityLabel={`Notificaciones${unreadCount > 0 ? ` - ${unreadCount} sin leer` : ''}`}
      accessibilityRole="button"
    >
      <Icon
        as={Bell}
        className="text-typography-600"
      />
      
      {showCount && unreadCount > 0 && (
        <Box className="absolute -top-1 -right-1 bg-error-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-2xs font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

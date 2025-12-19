// components/profile/UserInfoCard/UserInfoCard.tsx
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Mail, Briefcase, Building2 } from 'lucide-react-native';
import { HStack } from '@/components/ui/hstack';
import type { User } from '@/types';

interface UserInfoCardProps {
  user: User;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  return (
    <Box className="bg-background-50 rounded-xl p-5 mb-4">
      <VStack className="gap-4">
        <VStack className="gap-1">
          <Heading size="xl" className="text-typography-900">
            {user.name}
          </Heading>
        </VStack>

        <VStack className="gap-3">
          <HStack className="items-center gap-3">
            <Icon as={Mail} size="sm" className="text-typography-400" />
            <Text className="text-typography-600 flex-1">
              {user.email}
            </Text>
          </HStack>

          <HStack className="items-center gap-3">
            <Icon as={Briefcase} size="sm" className="text-typography-400" />
            <Text className="text-typography-600 flex-1">
              {user.role}
            </Text>
          </HStack>

          <HStack className="items-center gap-3">
            <Icon as={Building2} size="sm" className="text-typography-400" />
            <Text className="text-typography-600 flex-1">
              {user.companyName}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
}
import { Pressable } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

type ThemeToggleProps = {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

export function ThemeToggle({ size = 'md', showLabel = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <Pressable
      onPress={toggleTheme}
      className="p-2 rounded-lg hover:bg-background-100 active:bg-background-200 transition-colors"
      accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      accessibilityRole="button"
    >
      <Icon
        as={isDark ? Sun : Moon}
        className={isDark ? 'text-yellow-400' : 'text-typography-600'}
      />
    </Pressable>
  );
}

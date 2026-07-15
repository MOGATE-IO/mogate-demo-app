import type { PropsWithChildren } from 'react';
import { Button as HeroButton } from 'heroui-native';
import { ActivityIndicator } from 'react-native';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}>;

const VARIANT_MAP = {
  primary: 'primary',
  secondary: 'secondary',
  quiet: 'ghost',
  danger: 'danger-soft'
} as const;

export function Button({
  children,
  disabled,
  loading,
  onPress,
  variant = 'secondary'
}: ButtonProps) {
  const spinnerColor = variant === 'primary' ? '#ffffff' : '#18181b';

  return (
    <HeroButton
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      className="min-h-11 rounded-lg px-4"
      isDisabled={disabled || loading}
      onPress={onPress}
      size="md"
      variant={VARIANT_MAP[variant]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <HeroButton.Label>{children}</HeroButton.Label>
      )}
    </HeroButton>
  );
}

import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}>;

export function Button({
  children,
  disabled,
  loading,
  onPress,
  variant = 'secondary'
}: ButtonProps) {
  const textStyle = styles[`${variant}Text` as const];
  const spinnerColor = variant === 'primary' ? '#ffffff' : '#171512';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.text, textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primary: {
    backgroundColor: '#171512'
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1dbd0'
  },
  quiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e1dbd0'
  },
  danger: {
    backgroundColor: '#fff0ee',
    borderWidth: 1,
    borderColor: '#f1b5ad'
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ translateY: 1 }]
  },
  text: {
    fontSize: 14,
    fontWeight: '700'
  },
  primaryText: {
    color: '#ffffff'
  },
  secondaryText: {
    color: '#171512'
  },
  quietText: {
    color: '#59524a'
  },
  dangerText: {
    color: '#a3372d'
  }
});

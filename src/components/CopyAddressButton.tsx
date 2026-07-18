import { Check, Copy } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

export function CopyAddressButton({
  accessibilityLabel,
  copied,
  disabled,
  onCopy
}: {
  accessibilityLabel: string;
  copied: boolean;
  disabled?: boolean;
  onCopy: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), selected: copied }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => void onCopy()}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        copied && styles.copied
      ]}
    >
      {copied ? <Check color="#23845b" size={19} strokeWidth={2.5} /> : <Copy color="#52525b" size={19} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderColor: '#e4e4e7',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  copied: {
    backgroundColor: '#ecfdf3',
    borderColor: '#b9e7c8'
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }]
  }
});

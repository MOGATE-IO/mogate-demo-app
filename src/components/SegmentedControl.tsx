import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8
  },
  segmentActive: {
    backgroundColor: '#171512'
  },
  segmentText: {
    color: '#6f6860',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0
  },
  segmentTextActive: {
    color: '#ffffff'
  }
});

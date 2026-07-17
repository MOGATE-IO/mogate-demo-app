import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  View
} from 'react-native';

export function FixedHeaderScrollView({
  children,
  contentContainerStyle,
  header
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>{header}</View>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingBottom: 12,
    zIndex: 2
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: 18,
    paddingBottom: 40
  }
});

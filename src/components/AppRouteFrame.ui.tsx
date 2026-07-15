import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppRouteFrame({
  children,
  scroll = true,
  tabbed = false
}: PropsWithChildren<{
  scroll?: boolean;
  tabbed?: boolean;
}>) {
  const webNotice = Platform.OS === 'web' ? (
    <View style={styles.webNotice}>
      <Text style={styles.webNoticeText}>
        Web mode is for UI review only. Native Privy signing, Particle native auth, and mobile funding require an Expo development build.
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView
      edges={tabbed ? ['top', 'left', 'right'] : ['top', 'right', 'bottom', 'left']}
      style={styles.safe}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {webNotice}
            {children}
          </ScrollView>
        ) : (
          <View style={styles.contentFill}>
            {webNotice}
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#f5f5f5',
    flex: 1
  },
  keyboard: {
    flex: 1
  },
  content: {
    gap: 16,
    paddingBottom: 96,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  contentFill: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  webNotice: {
    backgroundColor: '#fff8e9',
    borderColor: '#edd49a',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  webNoticeText: {
    color: '#7b5812',
    fontSize: 13,
    lineHeight: 18
  }
});

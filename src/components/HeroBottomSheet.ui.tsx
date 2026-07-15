import type { ReactNode } from 'react';
import { Button, Surface, Typography } from 'heroui-native';
import { X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HeroBottomSheet({
  children,
  description,
  headerLeading,
  onClose,
  size = 'large',
  title,
  visible
}: {
  children: ReactNode;
  description?: string;
  headerLeading?: ReactNode;
  onClose: () => void;
  size?: 'compact' | 'large';
  title: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.dismissArea}
        />
        <Surface
          className="rounded-t-lg border border-border bg-background shadow-lg"
          style={[
            styles.sheet,
            size === 'compact' ? styles.compactSheet : styles.largeSheet,
            { paddingBottom: Math.max(insets.bottom, 12) }
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            {headerLeading}
            <View style={styles.headerCopy}>
              <Typography.Heading type="h4">{title}</Typography.Heading>
              {description ? <Typography color="muted" type="body-sm">{description}</Typography> : null}
            </View>
            <Button
              accessibilityLabel="Close sheet"
              className="h-10 w-10 rounded-lg"
              isIconOnly
              onPress={onClose}
              variant="secondary"
            >
              <X color="#18181b" size={19} />
            </Button>
          </View>
          <View style={styles.content}>{children}</View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(63,56,48,0.28)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  dismissArea: {
    flex: 1
  },
  sheet: {
    paddingTop: 8
  },
  compactSheet: {
    maxHeight: '72%',
    minHeight: '55%'
  },
  largeSheet: {
    maxHeight: '92%',
    minHeight: '72%'
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: '#d4d4d8',
    borderRadius: 3,
    height: 5,
    width: 44
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  content: {
    flex: 1
  }
});

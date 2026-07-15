import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type BottomSheetProps = {
  visible: boolean;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
};

export function BottomSheet({
  children,
  eyebrow,
  onClose,
  title,
  visible
}: BottomSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close sheet" accessibilityRole="button" onPress={onClose} style={styles.dismissArea} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              {eyebrow ? <Text style={styles.kicker}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(23,21,18,0.32)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  dismissArea: {
    flex: 1
  },
  sheet: {
    backgroundColor: '#f6f5f2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 10
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: '#d6d0c6',
    borderRadius: 999,
    height: 4,
    width: 46
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  kicker: {
    color: '#8b7461',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: '#171512',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0
  },
  closeButton: {
    alignItems: 'center',
    borderColor: '#e1dbd0',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14
  },
  closeText: {
    color: '#59524a',
    fontSize: 13,
    fontWeight: '800'
  }
});

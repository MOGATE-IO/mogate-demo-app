import { useEffect, useRef, type ComponentType } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Separator, Typography } from 'heroui-native';
import {
  Bell,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Settings,
  UserRound,
  X
} from 'lucide-react-native';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AccountSection } from '@/navigation/account';
import { shortenAddress } from '@/utils/format';

type DrawerMenuItem = {
  id: AccountSection;
  label: string;
  detail: string;
  Icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
};

const MENU_ITEMS: DrawerMenuItem[] = [
  { id: 'notifications', label: 'Notifications', detail: 'Payment and giftcard updates', Icon: Bell },
  { id: 'settings', label: 'Settings', detail: 'App and network preferences', Icon: Settings }
];

export type AccountDrawerProps = {
  accountName: string;
  avatarLabel: string;
  balanceDisplay: string;
  giftcardCount: number;
  networkLabel: string;
  ownerAddress: string;
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSection: (section: AccountSection) => void;
};

export function AccountDrawer({
  accountName,
  avatarLabel,
  balanceDisplay,
  giftcardCount,
  networkLabel,
  onClose,
  onOpenProfile,
  onOpenSection,
  ownerAddress,
  visible
}: AccountDrawerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.88, 360);
  const translateX = useRef(new Animated.Value(drawerWidth)).current;

  useEffect(() => {
    if (!visible) return;
    translateX.setValue(drawerWidth);
    Animated.timing(translateX, {
      duration: 210,
      toValue: 0,
      useNativeDriver: true
    }).start();
  }, [drawerWidth, translateX, visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close account menu"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top,
              transform: [{ translateX }],
              width: drawerWidth
            }
          ]}
        >
          <SafeAreaView edges={['right']} style={styles.safeArea}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitle}>
                <Typography.Heading type="h4">Account</Typography.Heading>
                <Typography color="muted" type="body-xs">Wallet and Mogate settings</Typography>
              </View>
              <Button
                accessibilityLabel="Close account menu"
                className="h-11 w-11 rounded-lg"
                isIconOnly
                onPress={onClose}
                variant="secondary"
              >
                <X color="#3f3f46" size={20} />
              </Button>
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom + 24, 40) }
              ]}
              contentInsetAdjustmentBehavior="always"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              <Pressable
                accessibilityHint="Opens full profile"
                accessibilityLabel={`${accountName} profile`}
                accessibilityRole="button"
                onPress={onOpenProfile}
                style={({ pressed }) => [styles.profilePressable, pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={['#ffd0a6', '#ff8957', '#d86d91']}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.profileCard}
                >
                  <View style={styles.profileTop}>
                    <Avatar alt={`${accountName} profile`} color="default" size="md" variant="soft">
                      <Avatar.Fallback>{avatarLabel}</Avatar.Fallback>
                    </Avatar>
                    <View style={styles.profileCopy}>
                      <Typography numberOfLines={1} weight="bold">{accountName}</Typography>
                      <Typography numberOfLines={1} style={styles.sunsetMuted} type="body-xs">
                        {shortenAddress(ownerAddress)}
                      </Typography>
                    </View>
                    <ChevronRight color="#4a231b" size={20} />
                  </View>
                  <View style={styles.networkRow}>
                    <View style={styles.networkDot} />
                    <Typography numberOfLines={1} style={styles.sunsetText} type="body-xs" weight="semibold">
                      {networkLabel}
                    </Typography>
                  </View>
                  <View style={styles.balanceRow}>
                    <View>
                      <Typography style={styles.sunsetMuted} type="body-xs">USD balance</Typography>
                      <Typography.Heading type="h4">{balanceDisplay}</Typography.Heading>
                    </View>
                    <View style={styles.cardCount}>
                      <Typography style={styles.sunsetMuted} type="body-xs">Giftcards</Typography>
                      <Typography weight="bold">{giftcardCount}</Typography>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>

              <View style={styles.menu}>
                <DrawerRow
                  detail="Wallets and portfolio"
                  Icon={UserRound}
                  label="Profile"
                  onPress={onOpenProfile}
                />
                <Separator />
                {MENU_ITEMS.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <Separator /> : null}
                    <DrawerRow
                      detail={item.detail}
                      Icon={item.Icon}
                      label={item.label}
                      onPress={() => onOpenSection(item.id)}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.languageRow}>
                <Globe2 color="#71717a" size={19} />
                <View style={styles.languageCopy}>
                  <Typography type="body-sm" weight="semibold">English</Typography>
                  <Typography color="muted" type="body-xs">Language</Typography>
                </View>
                <Typography color="muted" type="body-sm">🇺🇸</Typography>
              </View>

              <View style={styles.protectionRow}>
                <LockKeyhole color="#2f8f5b" size={17} />
                <Typography color="muted" type="body-xs">Embedded wallet protection is active.</Typography>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerRow({
  detail,
  Icon,
  label,
  onPress
}: {
  detail: string;
  Icon: DrawerMenuItem['Icon'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
    >
      <View style={styles.menuIcon}>
        <Icon color="#52525b" size={19} strokeWidth={2} />
      </View>
      <View style={styles.menuCopy}>
        <Typography type="body-sm" weight="semibold">{label}</Typography>
        <Typography color="muted" numberOfLines={1} type="body-xs">{detail}</Typography>
      </View>
      <ChevronRight color="#a1a1aa" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(24,24,27,0.32)',
    flex: 1
  },
  drawer: {
    backgroundColor: '#ffffff',
    bottom: 0,
    height: '100%',
    position: 'absolute',
    right: 0,
    shadowColor: '#18181b',
    shadowOffset: { height: 0, width: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    top: 0
  },
  safeArea: {
    flex: 1
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomColor: '#dedee0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16
  },
  scroll: {
    flex: 1
  },
  drawerTitle: {
    flex: 1,
    gap: 2
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  profilePressable: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  profileCard: {
    gap: 14,
    minHeight: 190,
    padding: 16
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  profileCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  sunsetText: {
    color: '#3b201a'
  },
  sunsetMuted: {
    color: '#5f3025'
  },
  networkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  networkDot: {
    backgroundColor: '#2f8f5b',
    borderRadius: 999,
    height: 8,
    width: 8
  },
  balanceRow: {
    alignItems: 'flex-end',
    borderTopColor: 'rgba(74,35,27,0.18)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14
  },
  cardCount: {
    alignItems: 'flex-end',
    gap: 2
  },
  menu: {
    borderColor: '#dedee0',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden'
  },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  rowPressed: {
    backgroundColor: '#f4f4f5'
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  menuCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  languageRow: {
    alignItems: 'center',
    borderColor: '#dedee0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12
  },
  languageCopy: {
    flex: 1,
    gap: 1
  },
  protectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4
  }
});

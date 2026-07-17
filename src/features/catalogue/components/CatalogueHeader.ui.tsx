import { Avatar, Button, Typography } from 'heroui-native';
import { StyleSheet, View } from 'react-native';

import MogateMark from '@assets/mogate-mark-white.svg';

export function CatalogueHeader({
  accountName,
  avatarLabel,
  onOpenAccount
}: {
  accountName: string;
  avatarLabel: string;
  onOpenAccount: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <MogateMark height={24} width={28} />
        </View>
        <View style={styles.brandCopy}>
          <Typography.Heading type="h3">Mogate</Typography.Heading>
          <Typography color="muted" type="body-xs">Giftcard catalogue</Typography>
        </View>
      </View>
      <Button
        accessibilityLabel={`Open ${accountName} account menu`}
        className="h-11 w-11 rounded-full p-0"
        isIconOnly
        onPress={onOpenAccount}
        variant="ghost"
      >
        <Avatar alt={`${accountName} profile`} color="accent" size="sm" variant="soft">
          <Avatar.Fallback>{avatarLabel}</Avatar.Fallback>
        </Avatar>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    minWidth: 0,
    width: '100%'
  },
  brand: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0
  },
  mark: {
    alignItems: 'center',
    backgroundColor: '#e9680c',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  brandCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0
  }
});

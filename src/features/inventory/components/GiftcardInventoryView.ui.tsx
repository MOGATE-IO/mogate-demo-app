import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Button,
  Chip,
  Input,
  Label,
  Separator,
  Skeleton,
  Surface,
  TextField,
  Typography
} from 'heroui-native';
import {
  ArrowUpRight,
  CircleAlert,
  Eye,
  Gift,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Send,
  WalletCards
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import { BrandImage } from '@/components/BrandImage.ui';
import { HeroBottomSheet } from '@/components/HeroBottomSheet.ui';
import type { GiftcardInventoryState } from '@/features/inventory/hooks/useGiftcardInventory';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import { shortenAddress } from '@/utils/format';

type InventoryAction = 'view' | 'send' | 'code' | 'encrypt';

export function GiftcardInventoryView({
  inventory,
  onBrowse,
  profile
}: {
  inventory: GiftcardInventoryState;
  onBrowse: () => void;
  profile: RuntimeNetworkProfile;
}) {
  const [selected, setSelected] = useState<GiftcardInventoryItem | null>(null);
  const [action, setAction] = useState<InventoryAction>('view');

  const openItem = (item: GiftcardInventoryItem) => {
    setSelected(item);
    setAction('view');
  };

  return (
    <View style={styles.screenStack}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Typography.Heading type="h2">Inventory</Typography.Heading>
          <Typography color="muted">Giftcards owned by your connected wallet.</Typography>
        </View>
        <Button
          accessibilityLabel="Refresh giftcard inventory"
          className="h-11 w-11 rounded-lg"
          isIconOnly
          onPress={inventory.refresh}
          variant="secondary"
        >
          {inventory.status === 'loading' ? (
            <ActivityIndicator color="#18181b" size="small" />
          ) : (
            <RefreshCw color="#18181b" size={19} />
          )}
        </Button>
      </View>

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.portfolioRow}>
          <View style={styles.portfolioIcon}>
            <WalletCards color="#e9680c" size={23} />
          </View>
          <View style={styles.portfolioMetric}>
            <Typography.Heading type="h4">{inventory.items.length}</Typography.Heading>
            <Typography color="muted" type="body-xs">Owned cards</Typography>
          </View>
          <Separator orientation="vertical" style={styles.metricDivider} />
          <View style={[styles.portfolioMetric, styles.valueMetric]}>
            <Typography.Heading type="h4">{formatUsdAmount(inventory.totalValue)}</Typography.Heading>
            <Typography color="muted" type="body-xs">Estimated value</Typography>
          </View>
        </View>
      </Surface>

      {inventory.lastError ? (
        <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
          <View style={styles.messageRow}>
            <CircleAlert color="#c43d45" size={18} />
            <Typography style={styles.errorText} type="body-sm">{inventory.lastError}</Typography>
          </View>
        </Surface>
      ) : null}

      {inventory.status === 'loading' && inventory.items.length === 0 ? (
        <InventorySkeleton />
      ) : inventory.items.length > 0 ? (
        <View style={styles.cardList}>
          {inventory.items.map((item) => (
            <GiftcardCard item={item} key={item.id} onPress={() => openItem(item)} />
          ))}
        </View>
      ) : inventory.status !== 'error' ? (
        <Surface className="items-center gap-4 rounded-lg border border-border bg-surface p-6 shadow-none">
          <View style={styles.emptyIcon}>
            <Gift color="#e9680c" size={28} />
          </View>
          <View style={styles.emptyCopy}>
            <Typography.Heading style={styles.centerText} type="h4">No giftcards found</Typography.Heading>
            <Typography color="muted" style={styles.centerText} type="body-sm">
              Cards minted to this wallet on {profile.ua.chainLabel} will appear here.
            </Typography>
          </View>
          <Button className="rounded-lg" onPress={onBrowse} variant="primary">
            <Button.Label>Browse giftcards</Button.Label>
          </Button>
        </Surface>
      ) : null}

      <GiftcardActionSheet
        action={action}
        inventory={inventory}
        item={selected}
        onAction={setAction}
        onClose={() => setSelected(null)}
        profile={profile}
      />
    </View>
  );
}

function GiftcardCard({ item, onPress }: { item: GiftcardInventoryItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint="Opens giftcard details and available actions"
      accessibilityLabel={`${item.title}, token ${item.tokenId}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={item.isUnwrapped ? ['#f4f4f5', '#eef2f7', '#f8f5f2'] : ['#fff7ed', '#eef8ff', '#f6f1ff']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.giftcard, pressed && styles.giftcardPressed]}
        >
          <View style={styles.cardTopRow}>
            <Typography type="body-xs" weight="semibold">GIFTCARD</Typography>
            <EthereumLogo height={24} width={24} />
          </View>
          <View style={styles.cardMiddle}>
            <View style={styles.logoWell}>
              <RemoteLogo item={item} />
            </View>
            <View style={styles.cardIdentity}>
              <Typography color="muted" numberOfLines={1} type="body-xs">{item.category.toUpperCase()}</Typography>
              <Typography.Heading numberOfLines={1} type="h4">{item.brandName}</Typography.Heading>
            </View>
          </View>
          <View style={styles.cardBottomRow}>
            <View style={styles.cardTokenCopy}>
              <Typography color="muted" type="body-xs">NFT #{item.tokenId}</Typography>
              <View style={styles.statusRow}>
                <Chip color={item.isUnwrapped ? 'default' : 'accent'} size="sm" variant="soft">
                  <Chip.Label>{item.isUnwrapped ? 'Unwrapped' : 'Public'}</Chip.Label>
                </Chip>
                {item.isEncrypted && !item.isUnwrapped ? (
                  <Chip color="success" size="sm" variant="soft">
                    <Chip.Label>Encrypted</Chip.Label>
                  </Chip>
                ) : null}
              </View>
            </View>
            <View style={styles.cardValueCopy}>
              <Typography color="muted" type="body-xs">Value</Typography>
              <Typography.Heading type="h3">{formatGiftcardValue(item)}</Typography.Heading>
            </View>
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function RemoteLogo({ item }: { item: GiftcardInventoryItem }) {
  return (
    <BrandImage
      accessibilityLabel={`${item.brandName} logo`}
      fallback={<Gift color="#ffffff" size={30} />}
      height={46}
      source={item.imageUrl}
      width={126}
    />
  );
}

function GiftcardActionSheet({
  action,
  inventory,
  item,
  onAction,
  onClose,
  profile
}: {
  action: InventoryAction;
  inventory: GiftcardInventoryState;
  item: GiftcardInventoryItem | null;
  onAction: (action: InventoryAction) => void;
  onClose: () => void;
  profile: RuntimeNetworkProfile;
}) {
  const [recipient, setRecipient] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const actions: Array<{ id: InventoryAction; label: string; Icon: typeof Eye }> = !item
    ? []
    : item.isUnwrapped
      ? [{ id: 'view', label: 'View', Icon: Eye }]
      : [
          { id: 'view', label: 'View', Icon: Eye },
          { id: 'send', label: 'Send', Icon: Send },
          { id: 'code', label: 'Code', Icon: KeyRound },
          ...(item.isEncrypted ? [{ id: 'encrypt' as const, label: 'Encrypt', Icon: LockKeyhole }] : [])
        ];

  const send = async () => {
    if (!item) return;
    setActionError(null);
    try {
      await inventory.sendGiftcard(item, recipient);
      setRecipient('');
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Giftcard transfer failed.');
    }
  };

  return (
    <HeroBottomSheet
      description={item ? `NFT #${item.tokenId} / ${item.networkLabel}` : undefined}
      onClose={onClose}
      title={item?.brandName ?? 'Giftcard'}
      visible={Boolean(item)}
    >
      {item ? (
        <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <GiftcardCard item={item} onPress={() => undefined} />

                <Surface className="rounded-lg border border-border bg-surface shadow-none">
                  <DetailRow label="Collection" value={shortenAddress(item.collection)} />
                  <Separator />
                  <DetailRow label="Region" value={item.region} />
                  <Separator />
                  <DetailRow label="Encryption" value={item.isEncrypted ? item.encryptionType ?? 'Active' : 'None'} />
                </Surface>

                <Typography.Heading type="h5">Actions</Typography.Heading>
                <View style={styles.actionGrid}>
                  {actions.map(({ id, label, Icon }) => {
                    const selected = id === action;
                    return (
                      <Button
                        accessibilityLabel={`${label} giftcard`}
                        className="h-12 rounded-lg"
                        key={id}
                        onPress={() => {
                          setActionError(null);
                          onAction(id);
                        }}
                        style={styles.actionButton}
                        variant={selected ? 'primary' : 'secondary'}
                      >
                        <Icon color={selected ? '#ffffff' : '#18181b'} size={18} />
                        <Button.Label>{label}</Button.Label>
                      </Button>
                    );
                  })}
                </View>

                <ActionPanel
                  action={action}
                  actionError={actionError}
                  item={item}
                  onRecipientChange={setRecipient}
                  onSend={send}
                  profile={profile}
                  recipient={recipient}
                  sending={inventory.sendingId === item.id}
                />
        </ScrollView>
      ) : null}
    </HeroBottomSheet>
  );
}

function ActionPanel({
  action,
  actionError,
  item,
  onRecipientChange,
  onSend,
  profile,
  recipient,
  sending
}: {
  action: InventoryAction;
  actionError: string | null;
  item: GiftcardInventoryItem;
  onRecipientChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  profile: RuntimeNetworkProfile;
  recipient: string;
  sending: boolean;
}) {
  if (action === 'view') {
    const explorerUrl = getNftExplorerUrl(profile, item);
    return (
      <Surface className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.panelTitleRow}>
          <Eye color="#e9680c" size={20} />
          <Typography weight="semibold">View NFT record</Typography>
        </View>
        <Typography color="muted" type="body-sm">
          Open the token and ownership record in the network explorer.
        </Typography>
        <Button className="rounded-lg" onPress={() => Linking.openURL(explorerUrl)} variant="primary">
          <Button.Label>Open explorer</Button.Label>
          <ArrowUpRight color="#ffffff" size={17} />
        </Button>
      </Surface>
    );
  }

  if (action === 'send') {
    return (
      <Surface className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.panelTitleRow}>
          <Send color="#e9680c" size={20} />
          <Typography weight="semibold">Send giftcard</Typography>
        </View>
        <TextField isInvalid={Boolean(actionError)}>
          <Label>Recipient wallet</Label>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-lg font-mono"
            onChangeText={onRecipientChange}
            placeholder="0x recipient address"
            value={recipient}
          />
        </TextField>
        {actionError ? <Typography style={styles.errorText} type="body-xs">{actionError}</Typography> : null}
        <Button className="rounded-lg" isDisabled={!recipient || sending} onPress={onSend} variant="primary">
          {sending ? <ActivityIndicator color="#ffffff" size="small" /> : <Send color="#ffffff" size={17} />}
          <Button.Label>{sending ? 'Sending' : 'Confirm transfer'}</Button.Label>
        </Button>
      </Surface>
    );
  }

  if (action === 'code') {
    return (
      <Surface className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.panelTitleRow}>
          <KeyRound color="#e9680c" size={20} />
          <Typography weight="semibold">Giftcard code</Typography>
        </View>
        {item.giftCode ? (
          <Surface className="rounded-lg bg-default p-4 shadow-none" variant="transparent">
            <Typography selectable style={styles.codeText} weight="bold">{item.giftCode}</Typography>
          </Surface>
        ) : (
          <Typography color="muted" type="body-sm">
            The protected code is not stored in public NFT metadata. Secure reveal remains unavailable until the Fhenix mobile decrypt adapter is connected.
          </Typography>
        )}
      </Surface>
    );
  }

  return (
    <Surface className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-none">
      <View style={styles.panelTitleRow}>
        <LockKeyhole color="#2f8f5b" size={20} />
        <Typography weight="semibold">Encryption active</Typography>
      </View>
      <Typography color="muted" type="body-sm">
        {item.encryptionType ?? 'Fhenix'} protects this giftcard claim. The NFT remains transferable until it is unwrapped.
      </Typography>
      <Chip color="success" size="sm" variant="soft">
        <Chip.Label>Protected</Chip.Label>
      </Chip>
    </Surface>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Typography color="muted" type="body-sm">{label}</Typography>
      <Typography numberOfLines={1} style={styles.detailValue} type="body-sm" weight="semibold">{value}</Typography>
    </View>
  );
}

function InventorySkeleton() {
  return (
    <View style={styles.cardList}>
      <Skeleton className="h-52 w-full rounded-lg" />
      <Skeleton className="h-52 w-full rounded-lg" />
    </View>
  );
}

function formatGiftcardValue(item: GiftcardInventoryItem) {
  if (item.value == null) return 'Private';
  if (item.currency.toUpperCase() === 'USD') return formatUsdAmount(item.value);
  return `${item.value} ${item.currency}`;
}

function getNftExplorerUrl(profile: RuntimeNetworkProfile, item: GiftcardInventoryItem) {
  if (profile.ua.targetChainId === 11155111) {
    return `https://sepolia.etherscan.io/token/${item.collection}?a=${item.tokenId}`;
  }
  if (profile.ua.targetChainId === 42161) {
    return `https://arbiscan.io/token/${item.collection}?a=${item.tokenId}`;
  }
  return item.externalUrl ?? `https://etherscan.io/token/${item.collection}?a=${item.tokenId}`;
}

const styles = StyleSheet.create({
  screenStack: {
    gap: 14
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  portfolioRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  portfolioIcon: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  portfolioMetric: {
    gap: 2
  },
  valueMetric: {
    alignItems: 'flex-end',
    flex: 1
  },
  metricDivider: {
    height: 38
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  errorText: {
    color: '#a12f37',
    flex: 1
  },
  cardList: {
    gap: 12
  },
  giftcard: {
    aspectRatio: 1.62,
    borderColor: '#ded8d1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 205,
    padding: 16
  },
  giftcardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cardMiddle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  logoWell: {
    alignItems: 'center',
    backgroundColor: '#e9680c',
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
    width: 138
  },
  logoImage: {
    height: 46,
    width: 126
  },
  cardIdentity: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  cardBottomRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  cardTokenCopy: {
    flex: 1,
    gap: 7
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  cardValueCopy: {
    alignItems: 'flex-end',
    gap: 2
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  emptyCopy: {
    gap: 5,
    maxWidth: 280
  },
  centerText: {
    textAlign: 'center'
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 36,
    paddingHorizontal: 18
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 14
  },
  detailValue: {
    flex: 1,
    textAlign: 'right'
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    flexBasis: '47%',
    flexGrow: 1
  },
  panelTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  codeText: {
    fontFamily: 'Courier',
    textAlign: 'center'
  }
});

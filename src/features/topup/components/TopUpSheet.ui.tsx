import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet.ui';
import { CopyAddressButton } from '@/components/CopyAddressButton';
import type { TopUpProvider } from '@/features/topup/hooks/useTopUpSheet';
import { shortenAddress } from '@/utils/format';

export type TopUpSheetProps = {
  visible: boolean;
  evmAddress?: string | null;
  solanaAddress?: string | null;
  copied?: string | null;
  copyError?: string | null;
  status?: {
    status: 'idle' | 'opening' | 'success' | 'error';
    message: string | null;
  };
  onClose: () => void;
  onCopyAddress: (label: string, address?: string | null) => void;
  onProviderTopUp: (provider: TopUpProvider) => void;
};

export function TopUpSheet({
  copied,
  copyError,
  evmAddress,
  onClose,
  onCopyAddress,
  onProviderTopUp,
  solanaAddress,
  status,
  visible
}: TopUpSheetProps) {
  const [showSolana, setShowSolana] = useState(false);
  const opening = status?.status === 'opening';

  return (
    <BottomSheet eyebrow="Top up" onClose={onClose} title="Add funds" visible={visible}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Send crypto</Text>
        <AddressBlock
          address={evmAddress}
          copied={copied === 'EVM address'}
          label="EVM address"
          note="Use this for USDC or USDT on Arbitrum, Ethereum, or Base."
          onCopy={() => onCopyAddress('EVM address', evmAddress)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showSolana }}
          onPress={() => setShowSolana((current) => !current)}
          style={styles.accordionTrigger}
        >
          <Text style={styles.accordionText}>Solana address</Text>
          <Text style={styles.chevron}>{showSolana ? '-' : '+'}</Text>
        </Pressable>
        {showSolana ? (
          <AddressBlock
            address={solanaAddress}
            copied={copied === 'Solana address'}
            label="Solana address"
            note="Use this only for supported SPL assets."
            onCopy={() => onCopyAddress('Solana address', solanaAddress)}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pay with card or local rails</Text>
        <ProviderRow
          disabled={!evmAddress || opening}
          label="MoonPay"
          meta="Visa, Mastercard, Apple Pay where available"
          marks="VISA  MC"
          onPress={() => onProviderTopUp('moonpay')}
        />
        <ProviderRow
          disabled={!evmAddress || opening}
          label="Transak"
          meta="Cards, bank transfer, and regional methods where available"
          marks="CARD  BANK"
          onPress={() => onProviderTopUp('transak')}
        />
      </View>

      {copyError ? <Text style={styles.statusError}>{copyError}</Text> : null}
      {status?.message ? (
        <Text style={[styles.statusText, status.status === 'error' && styles.statusError]}>
          {status.message}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

function AddressBlock({
  address,
  copied,
  label,
  note,
  onCopy
}: {
  address?: string | null;
  copied: boolean;
  label: string;
  note: string;
  onCopy: () => void;
}) {
  return (
    <View style={styles.addressBlock}>
      <View style={styles.addressCopy}>
        <Text style={styles.addressLabel}>{label}</Text>
        <Text selectable style={styles.addressValue}>
          {address ? shortenAddress(address, 8, 6) : 'Not available'}
        </Text>
      </View>
      <CopyAddressButton
        accessibilityLabel={`Copy ${label}`}
        copied={copied}
        disabled={!address}
        onCopy={onCopy}
      />
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

function ProviderRow({
  disabled,
  label,
  marks,
  meta,
  onPress
}: {
  disabled?: boolean;
  label: string;
  marks: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerRow,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <View style={styles.providerText}>
        <Text style={styles.providerLabel}>{label}</Text>
        <Text style={styles.providerMeta}>{meta}</Text>
      </View>
      <Text style={styles.providerMarks}>{marks}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  sectionTitle: {
    color: '#171512',
    fontSize: 15,
    fontWeight: '900'
  },
  addressBlock: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  addressCopy: {
    gap: 3
  },
  addressLabel: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  addressValue: {
    color: '#171512',
    fontSize: 18,
    fontWeight: '900'
  },
  note: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  accordionTrigger: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    justifyContent: 'space-between',
    paddingHorizontal: 14
  },
  accordionText: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '800'
  },
  chevron: {
    color: '#171512',
    fontSize: 20,
    fontWeight: '900'
  },
  providerRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    padding: 14
  },
  providerText: {
    flex: 1,
    gap: 3
  },
  providerLabel: {
    color: '#171512',
    fontSize: 16,
    fontWeight: '900'
  },
  providerMeta: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  providerMarks: {
    color: '#171512',
    fontSize: 11,
    fontWeight: '900'
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ translateY: 1 }]
  },
  statusText: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  statusError: {
    color: '#a3372d'
  }
});

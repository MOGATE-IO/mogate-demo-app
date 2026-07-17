import { useState, type ReactNode } from 'react';
import { Accordion, Button, Surface, Typography } from 'heroui-native';
import { CircleAlert, RefreshCw, Wallet } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StablecoinBalanceList } from '@/features/checkout/components/StablecoinBalanceList.ui';
import {
  formatTokenAmount,
  formatUsdAmount,
  type NativeBalanceRow,
  type StablecoinPortfolio,
  type StablecoinSymbol
} from '@/features/checkout/services/paymentBalances';

export function StablecoinPortfolioCard({
  defaultExpanded = false,
  detailFooter,
  errors = [],
  onRefresh,
  onSelect,
  onTopUp,
  portfolio,
  selected,
  showNativeSummary = false,
  status,
  nativeRows = []
}: {
  defaultExpanded?: boolean;
  detailFooter?: ReactNode;
  errors?: string[];
  onRefresh?: () => void | Promise<void>;
  onSelect: (symbol: StablecoinSymbol) => void;
  onTopUp?: () => void | Promise<void>;
  portfolio: StablecoinPortfolio;
  selected: StablecoinSymbol;
  showNativeSummary?: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  nativeRows?: NativeBalanceRow[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const nativeSummary = getNativeSummary(nativeRows);

  return (
    <Accordion
      className="rounded-lg"
      hideSeparator
      onValueChange={(value: string | undefined) => setExpanded(value === 'usd-balance')}
      selectionMode="single"
      value={expanded ? 'usd-balance' : undefined}
      variant="surface"
    >
      <Accordion.Item value="usd-balance">
        <Accordion.Trigger>
          <View style={styles.summary}>
            <View style={styles.summaryCopy}>
              <View style={styles.totalRow}>
                <Typography.Heading numberOfLines={1} type="h4">
                  {formatUsdAmount(portfolio.totalUsd)}
                </Typography.Heading>
                <Typography color="muted" type="body-xs" weight="semibold">USD</Typography>
              </View>
            </View>
          </View>
          <Accordion.Indicator />
        </Accordion.Trigger>
        <Accordion.Content>
          <View style={styles.details}>
            <StablecoinBalanceList
              onSelect={onSelect}
              rows={portfolio.rows}
              selected={selected}
              status={status}
            />

            {errors[0] ? (
              <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
                <View style={styles.errorRow}>
                  <CircleAlert color="#c43d45" size={17} />
                  <Typography style={styles.errorText} type="body-xs">{errors[0]}</Typography>
                </View>
              </Surface>
            ) : null}

            {detailFooter}

            {onTopUp || onRefresh ? (
              <View style={styles.actions}>
                {onTopUp ? (
                  <Button className="flex-1 rounded-lg" onPress={onTopUp} variant="secondary">
                    <Wallet color="#18181b" size={17} />
                    <Button.Label>Top up balance</Button.Label>
                  </Button>
                ) : null}
                {onRefresh ? (
                  <Button
                    accessibilityLabel="Refresh balances"
                    className="h-12 w-12 rounded-lg"
                    isIconOnly
                    onPress={onRefresh}
                    variant="secondary"
                  >
                    {status === 'loading' ? (
                      <ActivityIndicator color="#18181b" size="small" />
                    ) : (
                      <RefreshCw color="#18181b" size={18} />
                    )}
                  </Button>
                ) : null}
              </View>
            ) : null}

            {showNativeSummary ? (
              <View style={styles.nativeSummary}>
                <Typography color="muted" type="body-xs">Testnet native balance</Typography>
                <Typography type="body-sm" weight="semibold">{nativeSummary}</Typography>
              </View>
            ) : null}
          </View>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

function getNativeSummary(rows: NativeBalanceRow[]) {
  const totals = rows.reduce<Record<'ETH' | 'SOL', number>>(
    (result, row) => ({ ...result, [row.symbol]: result[row.symbol] + row.amount }),
    { ETH: 0, SOL: 0 }
  );
  const visible = (['ETH', 'SOL'] as const)
    .filter((symbol) => totals[symbol] > 0 || rows.some((row) => row.symbol === symbol))
    .map((symbol) => `${formatTokenAmount(totals[symbol])} ${symbol}`);
  return visible.length > 0 ? visible.join(' + ') : '0 ETH';
}

const styles = StyleSheet.create({
  summary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0
  },
  totalRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8
  },
  details: {
    gap: 12
  },
  errorRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  errorText: {
    color: '#a12f37',
    flex: 1
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  nativeSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32
  }
});

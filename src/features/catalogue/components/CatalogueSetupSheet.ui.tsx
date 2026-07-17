import { Button, Select, Typography } from 'heroui-native';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { HeroBottomSheet } from '@/components/HeroBottomSheet.ui';
import { CatalogueMerchantLogo } from '@/features/catalogue/components/CatalogueMerchantLogo.ui';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';
import { formatRegionLabel } from '@/utils/regions';

export type CatalogueSetupSheetProps = {
  merchant: GiftcardMerchant | null;
  selectedAmount: number | null;
  selectedRegion: string | null;
  onClose: () => void;
  onCheckout: (merchant: GiftcardMerchant, amount: number, region: string) => void;
  onSelectAmount: (amount: number) => void;
  onSelectRegion: (region: string) => void;
};

export function CatalogueSetupSheet({
  merchant,
  onCheckout,
  onClose,
  onSelectAmount,
  onSelectRegion,
  selectedAmount,
  selectedRegion
}: CatalogueSetupSheetProps) {
  const regionOptions = merchant
    ? Array.from(new Set([merchant.country, ...merchant.regions].filter((region): region is string => Boolean(region))))
    : [];
  const region = selectedRegion ?? regionOptions[0] ?? 'GLOBAL';
  const amount = selectedAmount ?? merchant?.availableAmounts[0] ?? null;
  const selectedRegionOption = { value: region, label: formatRegionLabel(region) };

  return (
    <HeroBottomSheet
      description={merchant?.category}
      headerLeading={merchant ? <CatalogueMerchantLogo large merchant={merchant} /> : null}
      onClose={onClose}
      size="compact"
      title={merchant?.name ?? 'Giftcard setup'}
      visible={Boolean(merchant)}
    >
      {merchant ? (
        <View style={styles.content}>
          <View style={styles.field}>
            <Typography color="muted" type="body-xs" weight="semibold">Value</Typography>
            <CatalogueAmountList
              amount={amount}
              amounts={merchant.availableAmounts}
              onSelectAmount={onSelectAmount}
            />
          </View>

          <View style={styles.field}>
            <Typography color="muted" type="body-xs" weight="semibold">Region</Typography>
            <Select
              onValueChange={(option) => {
                const next = Array.isArray(option) ? option[0] : option;
                if (next) onSelectRegion(next.value);
              }}
              value={selectedRegionOption}
            >
              <Select.Trigger className="rounded-lg">
                <Select.Value placeholder="Choose region" />
                <Select.TriggerIndicator />
              </Select.Trigger>
              <Select.Portal>
                <Select.Overlay />
                <Select.Content presentation="popover" width="trigger">
                  <Select.ListLabel>Available region</Select.ListLabel>
                  {regionOptions.map((option) => (
                    <Select.Item key={option} label={formatRegionLabel(option)} value={option}>
                      <Select.ItemLabel />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select>
          </View>

          <Button
            className="w-full rounded-lg"
            isDisabled={!amount || !region}
            onPress={() => {
              if (!amount || !region) return;
              onCheckout(merchant, amount, region);
            }}
            variant="primary"
          >
            <Button.Label>Continue</Button.Label>
            <ChevronRight color="#ffffff" size={18} />
          </Button>
        </View>
      ) : null}
    </HeroBottomSheet>
  );
}

export function CatalogueAmountList({
  amount,
  amounts,
  onSelectAmount
}: {
  amount: number | null;
  amounts: number[];
  onSelectAmount: (amount: number) => void;
}) {
  return (
    <View style={styles.amountGrid}>
      {amounts.map((nextAmount) => {
        const active = amount === nextAmount;
        return (
          <Button
            accessibilityLabel={`Choose $${nextAmount}`}
            accessibilityState={{ selected: active }}
            className={active
              ? 'min-w-[72px] rounded-lg border border-accent bg-accent-soft'
              : 'min-w-[72px] rounded-lg border border-border bg-surface'}
            key={nextAmount}
            onPress={() => onSelectAmount(nextAmount)}
            size="sm"
            variant="ghost"
          >
            <Button.Label className={active ? 'font-semibold text-accent' : 'font-semibold text-foreground'}>
              ${nextAmount}
            </Button.Label>
          </Button>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 8
  },
  field: {
    gap: 8
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  }
});

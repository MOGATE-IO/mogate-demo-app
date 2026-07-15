import { Button, Surface } from 'heroui-native';
import {
  HandCoins,
  House,
  Search,
  UserRound,
  WalletCards,
  type LucideIcon
} from 'lucide-react-native';
import { StyleSheet } from 'react-native';

export type MainTab = 'home' | 'search' | 'request' | 'inventory' | 'profile';

const TABS: Record<MainTab, { label: string; Icon: LucideIcon }> = {
  home: { label: 'Home', Icon: House },
  search: { label: 'Search', Icon: Search },
  request: { label: 'Request', Icon: HandCoins },
  inventory: { label: 'Cards', Icon: WalletCards },
  profile: { label: 'Profile', Icon: UserRound }
};

type BottomTabBarProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  const tabs = Object.keys(TABS) as MainTab[];

  return (
    <Surface className="rounded-lg border border-border bg-surface shadow-surface" style={styles.bar}>
      {tabs.map((tab) => {
        const active = activeTab === tab;
        const { Icon, label } = TABS[tab];

        return (
          <Button
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={
              active
                ? 'h-14 flex-1 flex-col gap-1 rounded-lg bg-accent-soft px-1 py-2'
                : 'h-14 flex-1 flex-col gap-1 rounded-lg px-1 py-2'
            }
            key={tab}
            onPress={() => onChange(tab)}
            size="sm"
            variant="ghost"
          >
            <Icon
              color={active ? '#e9680c' : '#71717a'}
              size={20}
              strokeWidth={active ? 2.4 : 2}
            />
            <Button.Label
              className={
                active
                  ? 'text-[10px] font-semibold text-accent'
                  : 'text-[10px] font-medium text-muted'
              }
              numberOfLines={1}
            >
              {label}
            </Button.Label>
          </Button>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
    marginHorizontal: 20,
    padding: 4
  }
});

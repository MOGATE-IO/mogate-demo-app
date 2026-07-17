import { Button, Surface } from 'heroui-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import {
  HandCoins,
  Newspaper,
  Store,
  Trophy,
  WalletCards,
  type LucideIcon
} from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isMainTabRouteName,
  MAIN_TAB_ROUTES,
  type MainTab
} from '@/navigation/tabs';

const TABS: Record<MainTab, { label: string; Icon: LucideIcon }> = {
  catalogue: { label: 'Catalogue', Icon: Store },
  updates: { label: 'Updates', Icon: Newspaper },
  request: { label: 'Request', Icon: HandCoins },
  leaderboard: { label: 'Leaders', Icon: Trophy },
  inventory: { label: 'Cards', Icon: WalletCards }
};

export function BottomTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Surface
      className="rounded-lg border border-border bg-surface shadow-surface"
      style={[styles.bar, { marginBottom: Math.max(insets.bottom, 12) }]}
    >
      {state.routes.map((route, index) => {
        if (!isMainTabRouteName(route.name)) return null;

        const tab = MAIN_TAB_ROUTES[route.name];
        const active = state.index === index;
        const { Icon, label } = TABS[tab];
        const options = descriptors[route.key]?.options;

        function handlePress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true
          });

          if (!active && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }

        function handleLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        return (
          <Button
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={
              active
                ? 'h-14 flex-1 flex-col gap-1 rounded-lg bg-accent-soft px-1 py-2'
                : 'h-14 flex-1 flex-col gap-1 rounded-lg px-1 py-2'
            }
            key={route.key}
            onLongPress={handleLongPress}
            onPress={handlePress}
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
    marginHorizontal: 20,
    padding: 4
  }
});

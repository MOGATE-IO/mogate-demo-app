import { Pressable, StyleSheet, Text, View } from 'react-native';

export type MainTab = 'home' | 'search' | 'request' | 'inventory' | 'profile';

const TAB_LABELS: Record<MainTab, string> = {
  home: 'Home',
  search: 'Search',
  request: 'Request',
  inventory: 'Inventory',
  profile: 'Profile'
};

type BottomTabBarProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  const tabs = Object.keys(TAB_LABELS) as MainTab[];

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab}
            onPress={() => onChange(tab)}
            style={styles.item}
          >
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {TAB_LABELS[tab]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ddd6ca',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 6
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minHeight: 52,
    justifyContent: 'center'
  },
  dot: {
    backgroundColor: '#d8d0c4',
    borderRadius: 999,
    height: 6,
    width: 6
  },
  dotActive: {
    backgroundColor: '#171512',
    height: 8,
    width: 18
  },
  label: {
    color: '#756d62',
    fontSize: 11,
    fontWeight: '800'
  },
  labelActive: {
    color: '#171512'
  }
});

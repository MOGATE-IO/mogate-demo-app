export type MainTab = 'catalogue' | 'updates' | 'request' | 'leaderboard' | 'inventory';

export type MainTabRouteName = 'index' | 'updates' | 'request' | 'leaderboard' | 'inventory';

export const MAIN_TAB_PATHS = {
  catalogue: '/',
  updates: '/updates',
  request: '/request',
  leaderboard: '/leaderboard',
  inventory: '/inventory'
} as const satisfies Record<MainTab, string>;

export const MAIN_TAB_ROUTES = {
  index: 'catalogue',
  updates: 'updates',
  request: 'request',
  leaderboard: 'leaderboard',
  inventory: 'inventory'
} as const satisfies Record<MainTabRouteName, MainTab>;

export function isMainTabRouteName(value: string): value is MainTabRouteName {
  return value in MAIN_TAB_ROUTES;
}

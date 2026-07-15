export type MainTab = 'home' | 'search' | 'request' | 'inventory' | 'profile';

export type MainTabRouteName = 'index' | 'search' | 'request' | 'inventory' | 'profile';

export const MAIN_TAB_PATHS = {
  home: '/',
  search: '/search',
  request: '/request',
  inventory: '/inventory',
  profile: '/profile'
} as const satisfies Record<MainTab, string>;

export const MAIN_TAB_ROUTES = {
  index: 'home',
  search: 'search',
  request: 'request',
  inventory: 'inventory',
  profile: 'profile'
} as const satisfies Record<MainTabRouteName, MainTab>;

export function isMainTabRouteName(value: string): value is MainTabRouteName {
  return value in MAIN_TAB_ROUTES;
}

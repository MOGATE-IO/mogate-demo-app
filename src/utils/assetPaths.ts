export function normalizeLocalAssetPath(value?: string | null) {
  if (!value?.startsWith('/')) return null;
  return value.split(/[?#]/, 1)[0] || null;
}

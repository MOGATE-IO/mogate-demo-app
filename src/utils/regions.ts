const REGION_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  ID: 'Indonesia',
  SG: 'Singapore',
  US: 'United States'
};

function countryFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...code.split('').map((letter) => 127397 + letter.charCodeAt(0)));
}

export function regionFlag(region: string) {
  const code = region.trim().toUpperCase();
  if (!code || code === 'GLOBAL') return '🌐';
  return countryFlag(code);
}

export function formatRegionLabel(region: string) {
  const code = region.trim().toUpperCase();
  if (!code || code === 'GLOBAL') return '🌐 Global';
  const name = REGION_NAMES[code];
  return `${countryFlag(code)} ${name ? `${name} (${code})` : code}`;
}

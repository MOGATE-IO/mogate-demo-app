export function shortenAddress(value?: string | null, head = 6, tail = 4) {
  if (!value) return 'Not connected';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatUsd(value?: string | number | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: numeric < 1 ? 4 : 2
  }).format(numeric);
}

export function prettyJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, nestedValue) => (typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue),
    2
  );
}

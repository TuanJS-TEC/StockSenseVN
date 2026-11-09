// Same output as the web's Intl.NumberFormat('vi-VN'): "." groups thousands, "," before decimals
// (51.000, 1.714,32). Written out by hand so it does not depend on the locale data of each phone.
function viNumber(value, maxDecimals) {
  const sign = value < 0 ? '-' : '';
  const [int, dec = ''] = Math.abs(value).toFixed(maxDecimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = dec.replace(/0+$/, '');
  return `${sign}${grouped}${decimals ? `,${decimals}` : ''}`;
}

export const formatMoney = (value) => (value == null ? '—' : viNumber(value, 0));
export const formatNumber = (value) => (value == null ? '—' : viNumber(value, 2));
export const formatPercent = (value) => (value == null ? '—' : `${Math.round(value * 100)}%`);

export function formatChange(value) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2).replace('.', ',')}%`;
}

export function formatPoints(value) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${viNumber(Math.abs(value), 2)}`;
}

// ISO day (YYYY-MM-DD) as dd/mm/yyyy without time-zone shifts.
export function formatDay(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Timestamp in Vietnam time, e.g. "14:50 09/11/2026". Vietnam is UTC+7 with no daylight saving, so the
// offset is applied directly: Hermes on phones does not support every Intl time-zone option a browser does.
export function formatDateTime(value) {
  const time = value ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) return '—';
  const d = new Date(time + 7 * 3600 * 1000);
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())} ${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

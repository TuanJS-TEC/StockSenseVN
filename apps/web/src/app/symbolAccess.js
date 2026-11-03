import { navigate } from './navigation.js';

export const NOT_ANALYSED = 'Hệ thống chưa hỗ trợ phân tích sâu mã này';
// Group tabs of the overview and price board: index baskets (index_memberships) and exchanges.
export const SYMBOL_GROUPS = [['all', 'Tất cả'], ['VN30', 'VN30'], ['VN100', 'VN100'], ['HOSE', 'HOSE'], ['HNX30', 'HNX30'], ['HNX', 'HNX']];
const EXCHANGES = ['HOSE', 'HNX', 'UPCOM'];

export function inGroup(item, group) {
  if (group === 'all') return true;
  return EXCHANGES.includes(group) ? item.exchange === group : (item.indices ?? []).includes(group);
}

// symbol -> analysisEnabled, filled by the app shell so pages without that flag (watchlist, search) can check it.
let analysis = new Map();
export function rememberSymbols(items) {
  analysis = new Map(items.map((item) => [item.symbol, item.analysisEnabled !== false]));
}

export function showNotice(message) {
  window.dispatchEvent(new CustomEvent('stocksense:notice', { detail: { message } }));
}

// Only analysed symbols open the detail page; the others raise a notice instead.
// Unknown codes still navigate so the detail page can report "not found".
export function openSymbol(symbol, analysisEnabled) {
  const code = symbol.toUpperCase();
  if ((analysisEnabled ?? analysis.get(code)) === false) { showNotice(`${code}: ${NOT_ANALYSED}.`); return false; }
  navigate(`/symbols/${code}`);
  return true;
}

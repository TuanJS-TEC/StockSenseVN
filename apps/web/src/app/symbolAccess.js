import { NOT_ANALYSED } from '@stocksense/core/symbol-groups';
import { navigate } from './navigation.js';

// Group logic and the notice text live in packages/core so the mobile app uses the same rules and wording.
export { NOT_ANALYSED, SYMBOL_GROUPS, inGroup } from '@stocksense/core/symbol-groups';

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

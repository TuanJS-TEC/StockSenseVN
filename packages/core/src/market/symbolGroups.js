// Symbol groups shared by web, mobile and API: fixed index baskets (index_memberships) and exchanges.
export const INDEX_GROUPS = Object.freeze(['VN30', 'VN100', 'HNX30']);
export const EXCHANGES = Object.freeze(['HOSE', 'HNX', 'UPCOM']);
// Group tabs of the overview and price board, in display order.
export const SYMBOL_GROUPS = Object.freeze([['all', 'Tất cả'], ['VN30', 'VN30'], ['VN100', 'VN100'], ['HOSE', 'HOSE'], ['HNX30', 'HNX30'], ['HNX', 'HNX']]);
// Shown for display-only symbols (analysisEnabled=false); same wording on web and mobile (FR-M14-05).
export const NOT_ANALYSED = 'Hệ thống chưa hỗ trợ phân tích sâu mã này';

// item has exchange and indices, as returned by /symbols, /market/board and /screener.
export function inGroup(item, group) {
  if (group === 'all') return true;
  return EXCHANGES.includes(group) ? item.exchange === group : (item.indices ?? []).includes(group);
}

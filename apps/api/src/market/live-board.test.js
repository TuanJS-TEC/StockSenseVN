import { describe, expect, it, vi } from 'vitest';
import { inTradingHours, mapSsiStock, overlayQuote, parseIndexChart, startLiveBoard } from './live-board.js';

// Trimmed https://iboard-query.ssi.com.vn/stock/exchange/hose row.
const ssiFpt = { stockSymbol: 'FPT', exchange: 'hose', companyNameVi: 'Công ty Cổ phần FPT', tradingDate: '20261119', session: 'LO',
  refPrice: 46950, ceiling: 50200, floor: 43700, best1Bid: 47100, best1BidVol: 1000, best2Bid: 47050, best2BidVol: 22000,
  best3Bid: null, best3BidVol: null, best1Offer: 47150, best1OfferVol: 9800, best2Offer: 47200, best2OfferVol: 2900,
  best3Offer: 47250, best3OfferVol: 14500, matchedPrice: 47050, matchedVolume: 8400, priceChange: 100, priceChangePercent: 0.21,
  nmTotalTradedQty: 1662700, nmTotalTradedValue: 78914810000, avgPrice: 47462.4, openPrice: 46950, highest: 47950, lowest: 46900,
  buyForeignQtty: 236600, sellForeignQtty: null, remainForeignQtty: 445215441 };
const eodRow = { symbol: 'FPT', exchange: 'HOSE', date: '2026-11-18', close: 46_950, forecasts: { t2: null } };

describe('live board', () => {
  it('maps an SSI stock row to a board row', () => {
    expect(mapSsiStock(ssiFpt)).toEqual({ symbol: 'FPT', exchange: 'HOSE', name: 'Công ty Cổ phần FPT', date: '2026-11-19', session: 'LO',
      reference: 46950, ceiling: 50200, floor: 43700,
      bids: [[47100, 1000], [47050, 22000], [null, null]], asks: [[47150, 9800], [47200, 2900], [47250, 14500]],
      price: 47050, matchedVolume: 8400, change: 100, changePercent: 0.21, volume: 1662700, value: 78914810000,
      avg: 47462, open: 46950, high: 47950, low: 46900, foreignBuy: 236600, foreignSell: null, foreignRoom: 445215441 });
  });

  it('overlays today\'s quote on a tracked row only until the database has today', () => {
    const quote = mapSsiStock(ssiFpt);
    expect(overlayQuote(eodRow, quote)).toMatchObject({ date: '2026-11-19', reference: 46950, close: 47050, turnover: 78914810000,
      tones: { close: 'up', low: 'down' }, priceDataStatus: 'intraday' });
    expect(overlayQuote({ ...eodRow, date: '2026-11-19' }, quote)).toBeNull();
    expect(overlayQuote(eodRow, { ...quote, price: null })).toBeNull(); // no trade yet
  });

  it('keeps only today\'s 1-minute index bars', () => {
    // 2026-11-18 14:45 and 2026-11-19 09:15/09:16 Vietnam time.
    expect(parseIndexChart({ t: [1794987900, 1795054500, 1795054560], c: [1703, 1700, 1699.5] }, '2026-11-19'))
      .toEqual({ t: [1795054500, 1795054560], c: [1700, 1699.5] });
  });

  it('only polls fast in the Vietnamese trading window', () => {
    expect(inTradingHours(new Date('2026-11-19T02:30:00Z'))).toBe(true); // Thu 09:30 VN
    expect(inTradingHours(new Date('2026-11-19T09:00:00Z'))).toBe(false); // Thu 16:00 VN
    expect(inTradingHours(new Date('2026-11-21T02:30:00Z'))).toBe(false); // Sat
  });

  it('pushes only changed rows and merges quotes into the tracked board', async () => {
    let fpt = ssiFpt;
    const fetchImpl = vi.fn(async (url) => ({ ok: true, json: async () => {
      if (url.includes('/stock/exchange/hose')) return { data: [fpt] };
      if (url.includes('/stock/exchange/')) return { data: [] };
      if (url.includes('/stock/group/VN30')) return { data: [{ stockSymbol: 'FPT' }] };
      if (url.includes('/exchange-index/')) return { data: { indexValue: 1697.46, prevIndexValue: 1703.01, advances: 97 } };
      return { t: [], c: [] };
    } }));
    const live = startLiveBoard({ intervalMs: 0, fetchImpl, logger: {} });
    const listener = vi.fn();
    live.subscribe(listener);
    await live.poll();
    await live.poll(); // nothing changed: no push
    fpt = { ...ssiFpt, matchedPrice: 47100 };
    await live.poll();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].indices[0]).toMatchObject({ code: 'VNINDEX', label: 'VN-Index', value: 1697.46, advances: 97 });
    expect(listener.mock.calls[1][0]).toMatchObject({ rows: [{ symbol: 'FPT', price: 47100 }] });
    expect(listener.mock.calls[1][0].indices).toBeUndefined();
    expect(live.snapshot()).toMatchObject({ vn30: ['FPT'], rows: [{ symbol: 'FPT', price: 47100 }] });
    const merged = live.merge({ date: '2026-11-18', items: [eodRow] });
    expect(merged).toMatchObject({ date: '2026-11-19', live: { source: 'ssi' }, items: [{ close: 47100, forecasts: { t2: null } }] });
  });
});

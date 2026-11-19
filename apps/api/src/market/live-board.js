import { priceTone } from '@stocksense/core/price-board';

// Electronic price board (bảng giá điện tử): polls SSI iBoard's public feed for every listed stock (3-level bid/ask,
// matched trades, foreign flows) and index cards, plus DNSE's chart API for the intraday index lines.
// DNSE/TCBS order-book APIs need an account login, so they are not used for quotes.
// ponytail: polling every few seconds; a broker WebSocket/MQTT feed is the upgrade if tick-level latency matters.
const SSI = 'https://iboard-query.ssi.com.vn';
const DNSE_INDEX = 'https://services.entrade.com.vn/chart-api/v2/ohlcs/index';
const EXCHANGES = { hose: 'HOSE', hnx: 'HNX', upcom: 'UPCOM' };
// SSI index id -> card label and DNSE chart symbol.
export const INDICES = [
  { id: 'VNINDEX', label: 'VN-Index', chart: 'VNINDEX' },
  { id: 'VN30', label: 'VN30', chart: 'VN30' },
  { id: 'HNXIndex', label: 'HNX', chart: 'HNX' },
  { id: 'HNXUpcomIndex', label: 'UPCOM', chart: 'UPCOM' },
];

export const vnToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

// Weekday 08:55-15:10 Vietnam time covers the HOSE/HNX/UPCoM sessions including ATC and HNX post-close.
export function inTradingHours(now = new Date()) {
  const vn = new Date(now.getTime() + 7 * 3600_000);
  const day = vn.getUTCDay();
  const minutes = vn.getUTCHours() * 60 + vn.getUTCMinutes();
  return day >= 1 && day <= 5 && minutes >= 8 * 60 + 55 && minutes <= 15 * 60 + 10;
}

const orNull = (value) => (value === undefined ? null : value);

// One SSI /stock/exchange row -> board row. Prices in VND, volumes in shares.
export function mapSsiStock(raw) {
  const levels = (side) => [1, 2, 3].map((n) => [orNull(raw[`best${n}${side}`]), orNull(raw[`best${n}${side}Vol`])]);
  const day = /^\d{8}$/.test(raw.tradingDate ?? '') ? `${raw.tradingDate.slice(0, 4)}-${raw.tradingDate.slice(4, 6)}-${raw.tradingDate.slice(6)}` : null;
  return {
    symbol: raw.stockSymbol, exchange: EXCHANGES[raw.exchange] ?? String(raw.exchange ?? '').toUpperCase(), name: raw.companyNameVi ?? '',
    date: day, session: raw.session ?? null,
    reference: orNull(raw.refPrice), ceiling: orNull(raw.ceiling), floor: orNull(raw.floor),
    bids: levels('Bid'), asks: levels('Offer'),
    price: orNull(raw.matchedPrice), matchedVolume: orNull(raw.matchedVolume),
    change: orNull(raw.priceChange), changePercent: orNull(raw.priceChangePercent),
    volume: orNull(raw.nmTotalTradedQty), value: orNull(raw.nmTotalTradedValue),
    avg: raw.avgPrice == null ? null : Math.round(raw.avgPrice), open: orNull(raw.openPrice), high: orNull(raw.highest), low: orNull(raw.lowest),
    foreignBuy: orNull(raw.buyForeignQtty), foreignSell: orNull(raw.sellForeignQtty), foreignRoom: orNull(raw.remainForeignQtty),
  };
}

export function mapSsiIndex(raw, { id, label }) {
  return { code: id, label, value: raw.indexValue, previous: raw.prevIndexValue, change: raw.change, changePercent: raw.changePercent,
    volume: raw.totalQtty, turnover: raw.totalValue, advances: raw.advances, nochanges: raw.nochanges, declines: raw.declines,
    ceilings: raw.ceiling, floors: raw.floor };
}

// DNSE 1-minute index bars -> today's line ({ t: unix seconds, c: close }).
export function parseIndexChart(payload, today) {
  const t = []; const c = [];
  (payload?.t ?? []).forEach((time, i) => {
    if (vnToday(new Date(time * 1000)) === today) { t.push(time); c.push(payload.c[i]); }
  });
  return { t, c };
}

// Board row of a tracked symbol (end-of-day shape) overlaid with today's SSI quote, for summary breadth and chat.
export function overlayQuote(row, quote) {
  if (!quote?.date || !(quote.price > 0) || (row.date && row.date >= quote.date)) return null;
  const limits = { reference: quote.reference, ceiling: quote.ceiling, floor: quote.floor };
  return { date: quote.date, ...limits, open: quote.open, high: quote.high, low: quote.low, close: quote.price,
    change: quote.change, changePercent: quote.changePercent, volume: quote.volume, turnover: quote.value,
    tones: { open: priceTone(quote.open, limits), high: priceTone(quote.high, limits), low: priceTone(quote.low, limits), close: priceTone(quote.price, limits) },
    priceDataStatus: 'intraday' };
}

export function startLiveBoard({ intervalMs = 3000, idleMs = 300_000, chartMs = 60_000, fetchImpl = fetch, logger = console } = {}) {
  const rows = new Map(); // symbol -> { row, json }
  let indices = INDICES.map(({ id, label }) => ({ code: id, label, chart: { t: [], c: [] } }));
  let vn30 = [];
  let updatedAt = null;
  let chartsAt = 0;
  let groupsAt = 0;
  let timer = null;
  let running = false;
  let stopped = false;
  const listeners = new Set();

  const getJson = async (url) => {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`${new URL(url).host} ${response.status}`);
    return response.json();
  };
  const warn = (what, error) => logger.warn?.(`[StockSense API] live board ${what}: ${error?.message ?? error}`);

  async function poll() {
    if (running) return;
    running = true;
    try {
      const changed = [];
      const exchanges = await Promise.allSettled(Object.keys(EXCHANGES).map((code) => getJson(`${SSI}/stock/exchange/${code}`)));
      for (const result of exchanges) {
        if (result.status === 'rejected') { warn('stocks', result.reason); continue; }
        for (const raw of result.value?.data ?? []) {
          if (!raw?.stockSymbol) continue;
          const row = mapSsiStock(raw);
          const json = JSON.stringify(row);
          if (rows.get(row.symbol)?.json === json) continue;
          rows.set(row.symbol, { row, json });
          changed.push(row);
        }
      }

      if (Date.now() - groupsAt > 3600_000) {
        try {
          vn30 = (await getJson(`${SSI}/stock/group/VN30`)).data.map((raw) => raw.stockSymbol).sort();
          groupsAt = Date.now();
        } catch (error) { warn('VN30 basket', error); }
      }

      const today = vnToday();
      const refreshCharts = Date.now() - chartsAt >= chartMs;
      const from = Math.floor(new Date(`${today}T00:00:00+07:00`).getTime() / 1000);
      const next = await Promise.all(indices.map(async (card, i) => {
        const meta = INDICES[i];
        let updated = card;
        try { updated = { ...updated, ...mapSsiIndex((await getJson(`${SSI}/exchange-index/${meta.id}`)).data, meta) }; } catch (error) { warn(meta.id, error); }
        if (refreshCharts) {
          try {
            const url = `${DNSE_INDEX}?symbol=${meta.chart}&resolution=1&from=${from}&to=${Math.floor(Date.now() / 1000)}`;
            updated = { ...updated, chart: parseIndexChart(await getJson(url), today) };
          } catch (error) { warn(`${meta.chart} chart`, error); }
        }
        return updated;
      }));
      if (refreshCharts) chartsAt = Date.now();
      const indicesChanged = JSON.stringify(next) !== JSON.stringify(indices);
      indices = next;

      if (changed.length || indicesChanged) {
        updatedAt = new Date().toISOString();
        const update = { updatedAt, rows: changed, ...(indicesChanged ? { indices } : {}) };
        for (const fn of [...listeners]) {
          try { fn(update); } catch (error) { warn('listener', error); }
        }
      }
    } finally {
      running = false;
    }
  }

  const loop = async () => {
    try { await poll(); } catch (error) { warn('poll', error); }
    if (!stopped) timer = setTimeout(loop, inTradingHours() ? intervalMs : idleMs);
  };
  if (intervalMs > 0) loop();

  return {
    snapshot: () => ({ updatedAt, vn30, indices, rows: [...rows.values()].map((entry) => entry.row) }),
    // Tracked-symbol board (end-of-day rows) with today's quotes for rows the database has not caught up with.
    merge(board) {
      let merged = 0;
      const items = board.items.map((row) => {
        const overlay = overlayQuote(row, rows.get(row.symbol)?.row);
        if (!overlay) return row;
        merged += 1;
        return { ...row, ...overlay };
      });
      if (!merged) return board;
      const date = items.reduce((max, item) => (item.date && item.date > max ? item.date : max), board.date ?? '');
      return { ...board, date, items, live: { source: 'ssi', updatedAt } };
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    poll,
    stop() { stopped = true; clearTimeout(timer); },
  };
}

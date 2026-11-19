import { memo, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { openSymbol } from '../../app/symbolAccess.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { hasCapability } from '@stocksense/core/access';
import { priceTone } from '@stocksense/core/price-board';
import { Disclaimer, Icon } from '../../app/icons.jsx';
import { MiniLab } from '../../components/forecast.jsx';

// Electronic price board (bảng giá điện tử): every listed stock with 3-level bid/ask, matched trade and foreign flows,
// fed by the API's SSI poller over Server-Sent Events. Display only, no order entry.
const priceFmt = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const pointFmt = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const px = (value) => (value ? priceFmt.format(value / 1000) : ''); // thousand VND
const vol = (value) => (value ? intFmt.format(value / 10) : ''); // lots of 10 shares
const signed = (value, format) => (value == null ? '' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${format(Math.abs(value))}`);
const SESSIONS = { ATO: 'Phiên mở cửa (ATO)', LO: 'Khớp lệnh liên tục', ATC: 'Phiên đóng cửa (ATC)', PT: 'Thỏa thuận', C: 'Đã đóng cửa' };

// Flattened cell values of a row: what is compared to decide which cells flash.
function cellsOf(row) {
  const cells = { reference: row.reference, ceiling: row.ceiling, floor: row.floor, price: row.price, matchedVolume: row.matchedVolume,
    change: row.change, changePercent: row.changePercent, volume: row.volume, avg: row.avg, high: row.high, low: row.low,
    foreignBuy: row.foreignBuy, foreignSell: row.foreignSell, foreignRoom: row.foreignRoom };
  for (let i = 0; i < 3; i += 1) {
    [cells[`bp${i}`], cells[`bv${i}`]] = row.bids?.[i] ?? [];
    [cells[`ap${i}`], cells[`av${i}`]] = row.asks?.[i] ?? [];
  }
  return cells;
}

const fromSnapshot = (snapshot) => ({
  updatedAt: snapshot.updatedAt, indices: snapshot.indices ?? [], vn30: new Set(snapshot.vn30 ?? []),
  rows: new Map(snapshot.rows.map((row) => [row.symbol, { ...row, cells: cellsOf(row), flash: {} }])),
});

// Changed rows from the stream; a cell's flash counter re-keys it so its highlight animation replays.
function applyUpdate(board, update) {
  if (!board) return board;
  const rows = new Map(board.rows);
  for (const row of update.rows) {
    const previous = rows.get(row.symbol);
    const cells = cellsOf(row);
    const flash = { ...previous?.flash };
    if (previous) for (const id of Object.keys(cells)) if (cells[id] !== previous.cells[id]) flash[id] = (flash[id] ?? 0) + 1;
    rows.set(row.symbol, { ...row, cells, flash });
  }
  return { ...board, rows, updatedAt: update.updatedAt, indices: update.indices ?? board.indices };
}

// Cell id, format and colour of each column after the symbol.
function buildColumns(showPercent) {
  const fixed = (tone) => () => tone;
  const priceOf = (id) => (row) => priceTone(row.cells[id], row);
  const side = (prefix, order) => order.flatMap((i) => [
    { id: `${prefix}p${i}`, fmt: px, tone: priceOf(`${prefix}p${i}`) },
    { id: `${prefix}v${i}`, fmt: vol, tone: priceOf(`${prefix}p${i}`) },
  ]);
  return [
    { id: 'reference', fmt: px, tone: fixed('ref'), cls: 'bd-ref' },
    { id: 'ceiling', fmt: px, tone: fixed('ceiling'), cls: 'bd-ref' },
    { id: 'floor', fmt: px, tone: fixed('floor'), cls: 'bd-ref' },
    ...side('b', [2, 1, 0]),
    { id: 'price', fmt: px, tone: priceOf('price'), cls: 'bd-match bd-strong' },
    { id: 'matchedVolume', fmt: vol, tone: priceOf('price'), cls: 'bd-match' },
    showPercent
      ? { id: 'changePercent', fmt: (v) => signed(v, (n) => `${pointFmt.format(n)}%`), tone: priceOf('price'), cls: 'bd-match' }
      : { id: 'change', fmt: (v) => signed(v, (n) => priceFmt.format(n / 1000)), tone: priceOf('price'), cls: 'bd-match' },
    ...side('a', [0, 1, 2]),
    { id: 'volume', fmt: vol, tone: fixed('none'), cls: 'bd-strong' },
    { id: 'avg', fmt: px, tone: priceOf('avg') },
    { id: 'high', fmt: px, tone: priceOf('high') },
    { id: 'low', fmt: px, tone: priceOf('low') },
    { id: 'foreignBuy', fmt: vol, tone: fixed('none') },
    { id: 'foreignSell', fmt: vol, tone: fixed('none') },
    { id: 'foreignRoom', fmt: vol, tone: fixed('none') },
  ];
}

const BoardRow = memo(function BoardRow({ row, columns, watched, tracked, forecasts }) {
  const clickable = tracked !== undefined;
  const open = () => clickable && openSymbol(row.symbol, tracked.analysisEnabled);
  const symbolTone = priceTone(row.price || row.reference, row);
  return <tr className={clickable ? 'click' : ''} tabIndex={clickable ? 0 : undefined} onClick={open}
    onKeyDown={(event) => { if (event.key === 'Enter') open(); }}>
    <th scope="row" className={`bd-sym tone-${symbolTone}`} title={row.name}>
      {watched && <span className="watch-dot" title="Trong watchlist"><Icon name="star" filled /></span>}{row.symbol}
      {clickable && <span className="bd-tracked" title="Có phân tích StockSense">•</span>}
    </th>
    {columns.map(({ id, fmt, tone, cls = '' }) => {
      const flash = row.flash[id];
      return <td key={`${id}:${flash ?? 0}`} className={`num tone-${tone(row)} ${cls}${flash ? ' flash' : ''}`}>{fmt(row.cells[id])}</td>;
    })}
    {forecasts && (tracked?.analysisEnabled === false
      ? <td colSpan={2}><span className="chip no-analysis">Chỉ giá</span></td>
      : <><td><MiniLab forecast={tracked?.forecasts?.t2} /></td><td><MiniLab forecast={tracked?.forecasts?.t5} /></td></>)}
  </tr>;
});

export function PriceBoardPage() {
  const { user } = useAuth();
  const canWatch = hasCapability(user.role, 'watchlist.manage.self');
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(new Map()); // symbol -> { analysisEnabled, forecasts }
  const [watchlist, setWatchlist] = useState(new Set());
  const [tab, setTab] = useState('HOSE');
  const [query, setQuery] = useState('');
  const [showPercent, setShowPercent] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => api.market.live().then((snapshot) => { if (active) { setBoard(fromSnapshot(snapshot)); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.message || 'Không tải được bảng giá.'); });
    load();
    let connected = false; // the first `open` follows the initial load; later ones are reconnects that missed events
    const stopStream = api.market.liveStream((update) => { if (active) setBoard((current) => applyUpdate(current, update)); },
      () => { if (connected) load(); connected = true; });
    api.market.board().then((result) => {
      if (active) setTracked(new Map(result.items.map((item) => [item.symbol, { analysisEnabled: item.analysisEnabled, forecasts: item.forecasts }])));
    }).catch(() => {});
    if (canWatch) api.watchlist.list().then((result) => { if (active) setWatchlist(new Set(result.items.map((item) => item.symbol))); }).catch(() => {});
    return () => { active = false; stopStream(); };
  }, [canWatch]);

  const columns = useMemo(() => buildColumns(showPercent), [showPercent]);
  const tabs = [...(canWatch ? [['watch', 'Danh mục theo dõi']] : []), ['tracked', 'Mã phân tích'], ['HOSE', 'HOSE'], ['VN30', 'VN30'], ['HNX', 'HNX'], ['UPCOM', 'UPCOM']];
  const rows = useMemo(() => {
    if (!board) return [];
    const needle = query.trim().toUpperCase();
    const inTab = (row) => (tab === 'watch' ? watchlist.has(row.symbol) : tab === 'tracked' ? tracked.has(row.symbol)
      : tab === 'VN30' ? board.vn30.has(row.symbol) : row.exchange === tab);
    return [...board.rows.values()]
      .filter((row) => (needle ? row.symbol.includes(needle) || row.name.toUpperCase().includes(needle) : inTab(row)))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [board, tab, query, watchlist, tracked]);

  if (error && !board) return <main className="content"><div className="note bad" role="alert">{error}</div></main>;
  if (!board) return <main className="content"><div className="card muted">Đang tải bảng giá…</div></main>;

  const session = board.rows.get('FPT')?.session ?? [...board.rows.values()][0]?.session;
  const forecasts = tab === 'tracked';

  return <main className="content board-page">
    <div className="pagehead"><div><h1>Bảng giá</h1>
      <p className="small">
        {board.updatedAt ? <>Cập nhật <b className="num">{new Date(board.updatedAt).toLocaleTimeString('vi-VN')}</b></> : 'Chưa có dữ liệu trong phiên'}
        {session && <> · {SESSIONS[session] ?? session}</>} · {board.rows.size} mã niêm yết. Bấm mã có dấu • để xem phân tích.
      </p></div></div>

    {board.indices.length > 0 && <section className="index-strip" aria-label="Chỉ số thị trường">
      {board.indices.map((card) => <IndexCard key={card.code} card={card} />)}
    </section>}

    <section className="card">
      <div className="card-h">
        <div className="seg" role="group" aria-label="Nhóm mã">{tabs.map(([value, label]) =>
          <button key={value} type="button" className={tab === value && !query ? 'on' : ''} onClick={() => { setTab(value); setQuery(''); }}>{label}</button>)}</div>
        <div className="field" style={{ flexDirection: 'row' }}><input type="search" aria-label="Tìm mã trên mọi sàn" placeholder="Tìm mã hoặc tên" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      </div>
      <div className="board-scroll"><table className="eboard">
        <thead>
          <tr>
            <th rowSpan={2} className="bd-sym">Mã CK</th>
            <th rowSpan={2}>TC</th><th rowSpan={2}>Trần</th><th rowSpan={2}>Sàn</th>
            <th colSpan={6}>Bên mua</th>
            <th colSpan={3} className="bd-match">Khớp lệnh</th>
            <th colSpan={6}>Bên bán</th>
            <th rowSpan={2}>Tổng KL</th><th rowSpan={2}>TB</th><th rowSpan={2}>Cao</th><th rowSpan={2}>Thấp</th>
            <th colSpan={3}>ĐTNN</th>
            {forecasts && <th colSpan={2}>Dự báo</th>}
          </tr>
          <tr>
            <th>Giá 3</th><th>KL 3</th><th>Giá 2</th><th>KL 2</th><th>Giá 1</th><th>KL 1</th>
            <th className="bd-match">Giá</th><th className="bd-match">KL</th>
            <th className="bd-match"><button type="button" className="sort-button" onClick={() => setShowPercent((value) => !value)}
              title="Đổi giữa +/− và %">{showPercent ? '%' : '+/−'}</button></th>
            <th>Giá 1</th><th>KL 1</th><th>Giá 2</th><th>KL 2</th><th>Giá 3</th><th>KL 3</th>
            <th>Mua</th><th>Bán</th><th>Room</th>
            {forecasts && <><th>T+2</th><th>T+5</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <BoardRow key={row.symbol} row={row} columns={columns} watched={watchlist.has(row.symbol)}
            tracked={tracked.get(row.symbol)} forecasts={forecasts} />)}
          {!rows.length && <tr><td colSpan={forecasts ? 28 : 26} className="muted">Không có mã khớp bộ lọc.</td></tr>}
        </tbody>
      </table></div>
      <div className="board-legend small muted">
        <span><i className="sw tone-ceiling" />Trần</span><span><i className="sw tone-up" />Tăng</span><span><i className="sw tone-ref" />Tham chiếu</span><span><i className="sw tone-down" />Giảm</span><span><i className="sw tone-floor" />Sàn</span>
        <span>Giá: nghìn đồng · KL: 10 cổ phiếu. Nguồn SSI iBoard (cập nhật vài giây một lần), biểu đồ chỉ số từ DNSE.</span>
        {error && <span className="tone-down">{error}</span>}
      </div>
    </section>
    <Disclaimer />
  </main>;
}

// Index card: value, change, volume/value, breadth and the intraday line against the previous close (09:00-15:00).
function IndexCard({ card }) {
  const tone = card.change > 0 ? 'up' : card.change < 0 ? 'down' : 'ref';
  const { t = [], c = [] } = card.chart ?? {};
  let line = null;
  if (c.length > 1 && card.previous) {
    const day = new Date(t[0] * 1000 + 7 * 3600_000).toISOString().slice(0, 10);
    const start = Date.parse(`${day}T09:00:00+07:00`) / 1000;
    const span = 6 * 3600;
    const low = Math.min(card.previous, ...c);
    const high = Math.max(card.previous, ...c);
    const y = (value) => 52 - ((value - low) / (high - low || 1)) * 48;
    const points = c.map((value, i) => `${(((t[i] - start) / span) * 200).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
    line = <svg className="index-chart" viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="200" y1={y(card.previous)} y2={y(card.previous)} className="index-ref" />
      <polyline points={points} className={`index-line tone-${tone}`} />
    </svg>;
  }
  return <div className="index-card">
    <div className="index-head"><b>{card.label}</b>
      <span className={`num tone-${tone}`}>{card.value == null ? '—' : pointFmt.format(card.value)} {card.change != null && <small>{signed(card.change, pointFmt.format)} ({signed(card.changePercent, pointFmt.format)}%)</small>}</span></div>
    {line ?? <div className="index-chart" />}
    <div className="small muted num">{card.volume != null && `${intFmt.format(card.volume)} CP`}{card.turnover != null && ` · ${pointFmt.format(card.turnover / 1e9)} tỷ`}</div>
    <div className="small num index-breadth">
      <span className="tone-up">↑ {card.advances ?? 0}{card.ceilings ? <span className="tone-ceiling"> ({card.ceilings})</span> : null}</span>
      <span className="tone-ref">■ {card.nochanges ?? 0}</span>
      <span className="tone-down">↓ {card.declines ?? 0}{card.floors ? <span className="tone-floor"> ({card.floors})</span> : null}</span>
    </div>
  </div>;
}

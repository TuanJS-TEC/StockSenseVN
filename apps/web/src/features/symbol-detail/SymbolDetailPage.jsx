import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { navigate } from '../../app/navigation.js';
import { NOT_ANALYSED } from '../../app/symbolAccess.js';
import { CandleChart } from './CandleChart.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { hasCapability } from '@stocksense/core/access';
import { adjustedBars, quoteStats } from '@stocksense/core/quote';
import { addTradingDays, newsSession } from '@stocksense/core/calendar';
import { EXPERIMENTAL_FORECAST_NOTE, forecastStateNote } from '@stocksense/core/disclaimer';
import { defaultRange } from '@stocksense/core/news';
import { Disclaimer, Icon } from '../../app/icons.jsx';
import { ForecastCard } from '../../components/forecast.jsx';
import { NlpNewsItem } from './NlpNewsItem.jsx';
import { useNlpNews } from './useNlpNews.js';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const billions = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const formatPercent = (value) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2).replace('.', ',')}%`);
const signClass = (value) => (value > 0 ? 'c-up' : value < 0 ? 'c-down' : 'c-hold');
const toneClass = (tone) => `tone-${tone}`;
const formatDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('vi-VN') : '—');

export function SymbolDetailPage({ symbol }) {
  const { user } = useAuth();
  const canExportHistory = hasCapability(user.role, 'history.csv.export') && import.meta.env.VITE_HISTORY_CSV_EXPORT_ENABLED === 'true';
  const canWatch = hasCapability(user.role, 'watchlist.manage.self');
  const canPlan = hasCapability(user.role, 'plans.manage.self');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState('trade');
  // null until the user picks dates; then the default window follows the VN calendar day (a tab left open past midnight).
  const [newsRange, setNewsRange] = useState(null);
  const base = defaultRange();
  const newsFrom = newsRange?.from ?? base.from;
  const newsTo = newsRange?.to ?? base.to;
  const pickNews = (patch) => { const next = { from: newsFrom, to: newsTo, ...patch }; setNewsRange(next.from === base.from && next.to === base.to ? null : next); };
  const [openNews, setOpenNews] = useState(() => new Set());
  const [watching, setWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setTab('trade'); setNewsRange(null);
    api.symbols.detail(symbol)
      .then((detail) => (detail.analysisEnabled === false ? { detail, limited: true }
        : Promise.all([api.symbols.prices(symbol, 'all'), api.market.status().catch(() => null)])
          .then(([prices, status]) => ({ detail, prices, status }))))
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Không tải được dữ liệu mã cổ phiếu.'); })
      .finally(() => { if (active) setLoading(false); });
    if (canWatch) api.watchlist.list().then((result) => { if (active) setWatching(result.items.some((item) => item.symbol === symbol)); }).catch(() => {});
    return () => { active = false; };
  }, [symbol, canWatch]);

  const full = data && !data.limited;
  // Depend on prices, not data: a news event refreshes `data.detail` (flags) and must not rebuild the chart.
  const stats = useMemo(() => (full ? quoteStats(data.detail.exchange, data.prices.items) : null), [data?.prices]);
  const chartBars = useMemo(() => (full ? adjustedBars(data.prices.items) : []), [data?.prices]);
  // The detail carries the news flags (recentNews, missingNews): reload it when the news changed.
  const reloadFlags = useCallback(() => api.symbols.detail(symbol).then((detail) => setData((prev) => (prev && !prev.limited && prev.detail.symbol === detail.symbol ? { ...prev, detail } : prev)), () => {}), [symbol]);
  const nlp = useNlpNews(symbol, Boolean(full) && !loading, newsRange, reloadFlags);
  // Referentially stable unless the sessions change: a new array makes CandleChart rebuild (zoom/pan reset).
  const newsDaysKey = nlp.times ? nlp.times.items.map(newsSession).join(',') : '';
  const newsDays = useMemo(() => (newsDaysKey ? newsDaysKey.split(',') : []), [newsDaysKey]);
  const toggleNews = (id) => setOpenNews((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });

  // FR-M5-01: watchlist toggle from the symbol page.
  async function toggleWatch() {
    setWatchBusy(true); setActionError('');
    try {
      if (watching) await api.watchlist.remove(symbol); else await api.watchlist.add(symbol);
      setWatching(!watching);
    } catch (requestError) { setActionError(requestError.message || 'Không cập nhật được watchlist.'); }
    finally { setWatchBusy(false); }
  }
  const goBack = () => { if (window.history.length > 1) window.history.back(); else navigate('/board'); };

  if (loading) return <main className="content"><div className="card muted">Đang tải dữ liệu {symbol}…</div></main>;
  if (error) return <main className="content"><div><button className="btn sm" type="button" onClick={goBack}><Icon name="back" />Quay lại</button></div><div className="note bad" role="alert">{error}</div></main>;
  if (!data) return null;
  if (data.limited) {
    const { detail } = data;
    return <main className="content">
      <div><button className="btn sm" type="button" onClick={goBack}><Icon name="back" />Quay lại</button></div>
      <section className="card">
        <h1 style={{ margin: 0 }}>{detail.symbol} <small className="muted" style={{ fontSize: 14, fontWeight: 400 }}>{detail.name}</small></h1>
        <p className="muted small">{detail.exchange}{detail.industry ? ` · ${detail.industry}` : ''}{detail.indices?.length ? ` · ${detail.indices.join(', ')}` : ''}</p>
        <div className="note warn" role="status"><b>{NOT_ANALYSED}.</b> Mã này chỉ có giá cuối ngày; dự báo, giải thích và biểu đồ phân tích dành cho các mã mô hình đang hỗ trợ.</div>
        <div className="actions" style={{ marginTop: 12 }}><button className="btn" type="button" onClick={() => navigate('/board')}>Xem trên Bảng giá</button></div>
      </section>
    </main>;
  }

  const { detail, prices, status } = data;
  const quote = stats.quote;
  const t2 = detail.forecasts?.t2; const t5 = detail.forecasts?.t5;
  const conflict = (t2?.label === 'up' && t5?.label === 'down') || (t2?.label === 'down' && t5?.label === 'up');
  const labelText = { up: 'Tăng', hold: 'Đi ngang', down: 'Giảm' };
  const newsItem = (item) => <NlpNewsItem key={item.id} item={item} symbol={symbol} open={openNews.has(item.id)} onToggle={() => toggleNews(item.id)} />;
  const priceSource = prices.sourceStatus === 'live' ? 'giá SSI' : 'giá minh họa';
  const closeTone = quote.tones.close;

  return <main className="content">
    <div><button className="btn sm" type="button" onClick={goBack}><Icon name="back" />Quay lại</button></div>
    <div className="dhead">
      <div><div className="small muted">{detail.exchange}{detail.industry ? ` · ${detail.industry}` : ''}</div>
        <h1 style={{ fontSize: 28 }}>{detail.symbol} <span style={{ fontWeight: 500, fontSize: 16 }} className="muted">{detail.name}</span></h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }}>
          <span className={`px num ${toneClass(closeTone)}`}>{money.format(quote.close ?? detail.closePrice)}</span>
          <span className={`num ${toneClass(closeTone)}`}>{quote.change == null ? '' : `${quote.change > 0 ? '+' : quote.change < 0 ? '−' : ''}${money.format(Math.abs(quote.change))} (${formatPercent(quote.changePercent)})`}</span>
          <span className="small muted">đóng cửa {formatDate(quote.date)} · {priceSource}</span></div></div>
      <div className="actions">
        {canWatch && <button className="btn" type="button" disabled={watchBusy} onClick={toggleWatch}><Icon name={watching ? 'star' : 'plus'} />{watching ? 'Đang theo dõi' : 'Thêm watchlist'}</button>}
        {canPlan && <button className="btn" type="button" onClick={() => navigate(`/plans?symbol=${encodeURIComponent(symbol)}`)}><Icon name="target" />Lập Trade Plan</button>}
        <button className="btn" type="button" onClick={() => api.reports.symbol(symbol).catch((e) => setActionError(e.message))}><Icon name="pdf" />Xuất PDF</button>
        {canExportHistory && <button className="btn" type="button" onClick={() => api.symbols.historyCsv(symbol).catch((e) => setActionError(e.message))}><Icon name="dl" />CSV giá</button>}
      </div>
    </div>
    {actionError && <div className="note bad" role="alert">{actionError}</div>}
    <div className="tabs" role="tablist">{[['trade', 'Giao dịch'], ['fc', 'Dự báo'], ['news', 'Tin tức'], ['hist', 'Lịch sử giá']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
      <button type="button" disabled title="Cần mô hình AI">Giải thích mô hình <span className="tag">Sắp có</span></button></div>

    {tab === 'trade' && <div className="quote-layout">
      <section className="card quote-stats">
        <div className="limits">
          <div><span className="muted small">Tham chiếu</span><b className="num tone-ref">{money.format(quote.reference ?? 0)}</b></div>
          <div><span className="muted small">Trần</span><b className="num tone-ceiling">{quote.ceiling ? money.format(quote.ceiling) : '—'}</b></div>
          <div><span className="muted small">Sàn</span><b className="num tone-floor">{quote.floor ? money.format(quote.floor) : '—'}</b></div>
        </div>
        <dl className="kv">
          <dt>Mở cửa</dt><dd className={`num ${toneClass(quote.tones.open)}`}>{quote.open == null ? '—' : money.format(quote.open)}</dd>
          <dt>Cao nhất</dt><dd className={`num ${toneClass(quote.tones.high)}`}>{quote.high == null ? '—' : money.format(quote.high)}</dd>
          <dt>Thấp nhất</dt><dd className={`num ${toneClass(quote.tones.low)}`}>{quote.low == null ? '—' : money.format(quote.low)}</dd>
          <dt>Khối lượng</dt><dd className="num">{quote.volume == null ? '—' : money.format(quote.volume)}</dd>
          <dt>Giá trị (tỷ)</dt><dd className="num">{quote.turnover == null ? '—' : billions.format(quote.turnover / 1e9)}</dd>
          <dt>KL TB 20 phiên</dt><dd className="num">{stats.avgVolume20 == null ? '—' : money.format(stats.avgVolume20)}</dd>
          <dt>GTGD TB 20 phiên (tỷ)</dt><dd className="num">{detail.averageTurnover20d ? billions.format(detail.averageTurnover20d / 1e9) : '—'}</dd>
        </dl>
        <dl className="kv">
          <dt>% 1 tuần</dt><dd className={`num ${signClass(stats.week)}`}>{formatPercent(stats.week)}</dd>
          <dt>% 1 tháng</dt><dd className={`num ${signClass(stats.month)}`}>{formatPercent(stats.month)}</dd>
          <dt>% 3 tháng</dt><dd className={`num ${signClass(stats.quarter)}`}>{formatPercent(stats.quarter)}</dd>
          <dt>% từ đầu năm</dt><dd className={`num ${signClass(stats.ytd)}`}>{formatPercent(stats.ytd)}</dd>
          <dt>Cao nhất {stats.rangeLabel}</dt><dd className="num">{stats.rangeHigh == null ? '—' : money.format(stats.rangeHigh)}</dd>
          <dt>Thấp nhất {stats.rangeLabel}</dt><dd className="num">{stats.rangeLow == null ? '—' : money.format(stats.rangeLow)}</dd>
        </dl>
        <dl className="kv">
          <dt>Sàn</dt><dd>{detail.exchange}</dd>
          <dt>Ngành</dt><dd>{detail.industry || '—'}</dd>
          <dt>Dữ liệu giá</dt><dd>{prices.sourceStatus === 'live' ? 'SSI, cuối ngày' : 'Minh họa'}</dd>
          <dt>Trạng thái</dt><dd><DataStatusChips flags={detail.dataFlags} /></dd>
        </dl>
        <div className="small muted">Tham chiếu, trần, sàn của phiên gần nhất, tính từ phiên trước đó theo biên độ {detail.exchange === 'HOSE' ? '±7%' : detail.exchange === 'HNX' ? '±10%' : '±15%'} và bước giá của sàn.</div>
      </section>
      <section className="card chart"><div className="card-h"><h2>Biểu đồ giá</h2><span className="small muted">{prices.items.length} phiên · đến {formatDate(prices.latestDate)} · giá điều chỉnh</span></div>
        <CandleChart bars={chartBars} newsDays={newsDays} /></section>
      <section className="card quote-forecast"><div className="card-h"><h2>Dự báo xu hướng</h2></div>
        {conflict && <div className="note warn small"><b>Mâu thuẫn kỳ hạn:</b> T+2 {labelText[t2.label]}, T+5 {labelText[t5.label]}.</div>}
        <ForecastCard horizon="t2" forecast={t2} dueDate={addTradingDays(t2?.dataDate ?? status?.dataDate, 2, status?.holidays)} />
        <ForecastCard horizon="t5" forecast={t5} dueDate={addTradingDays(t5?.dataDate ?? status?.dataDate, 5, status?.holidays)} />
        {forecastStateNote(status?.state) && <div className="small muted">{forecastStateNote(status?.state)}.</div>}
        <Disclaimer />
      </section>
    </div>}

    {tab === 'fc' && <>
      {conflict && <div className="note warn"><b>Mâu thuẫn kỳ hạn.</b> T+2 dự báo {labelText[t2.label]}, T+5 dự báo {labelText[t5.label]}. Nên đọc cả hai thẻ trước khi quyết định.</div>}
      {status?.state === 'experimental' && <div className="note warn"><b>{EXPERIMENTAL_FORECAST_NOTE}.</b> Nhãn Đi ngang dựa trên mô hình biên độ; nhãn Tăng/Giảm chỉ mang tính tham khảo.</div>}
      {status?.state === 'demo' && <div className="note info">Dự báo hiển thị là <b>dữ liệu mẫu</b> trong khi mô hình AI chưa triển khai; giá thị trường {prices.sourceStatus === 'live' ? 'lấy từ SSI' : 'là dữ liệu minh họa'}.</div>}
      <div className="fcs"><ForecastCard horizon="t2" forecast={t2} dueDate={addTradingDays(t2?.dataDate ?? status?.dataDate, 2, status?.holidays)} /><ForecastCard horizon="t5" forecast={t5} dueDate={addTradingDays(t5?.dataDate ?? status?.dataDate, 5, status?.holidays)} /></div>
      <div className="grid g2">
        <section className="card"><div className="card-h"><h2>Tin mới nhất</h2><button className="btn sm" type="button" onClick={() => setTab('news')}>Xem tất cả</button></div>
          <div className="news">{nlp.recent?.items.slice(0, 3).map(newsItem)}{!nlp.recent && <p className="muted">Đang tải tin…</p>}{nlp.recent && !nlp.recent.items.length && <p className="muted">Chưa có tin nào của mã {symbol} trong 7 ngày gần nhất.</p>}</div></section>
        <section className="card"><div className="card-h"><h2>Trạng thái dữ liệu</h2></div>
          <dl className="kv"><dt>Giá</dt><dd>{prices.sourceStatus !== 'live' ? <span className="chip hold">Dữ liệu minh họa</span> : detail.dataFlags?.stalePrice ? <span className="chip down">Dữ liệu cũ · {formatDate(quote.date)}</span> : <span className="chip up">SSI · {formatDate(quote.date)}</span>}</dd>
            <dt>Tin tức</dt><dd>{detail.dataFlags?.missingNews ? <span className="chip hold">Thiếu tin 7 ngày gần nhất</span> : <span className="chip up">{detail.dataFlags?.recentNews ?? 0} bài</span>}</dd>
            <dt>Dự báo</dt><dd>{status?.state === 'demo' ? <span className="chip hold">Dữ liệu mẫu</span> : status?.state === 'experimental' ? <span className="chip hold">Thử nghiệm · {status?.modelVersion}</span> : <span className="chip up">Mô hình {status?.modelVersion}</span>}</dd>
            <dt>Batch</dt><dd className="num">{status?.batchCompletedAt ? dateTime.format(new Date(status.batchCompletedAt)) : '—'}</dd></dl>
          <div className="small muted" style={{ marginTop: 12 }}>Phần “Vì sao?” và “Điều gì có thể làm dự báo sai” sẽ có khi mô hình AI và giải thích (SHAP) sẵn sàng.</div></section>
      </div>
      <Disclaimer />
    </>}

    {tab === 'news' && <section className="card"><div className="card-h"><h2>Tin liên quan</h2>
      <div className="actions news-filters"><div className="field"><label htmlFor="news-from">Từ ngày</label><input id="news-from" type="date" value={newsFrom} max={newsTo || undefined} onChange={(e) => pickNews({ from: e.target.value })} /></div>
        <div className="field"><label htmlFor="news-to">Đến ngày</label><input id="news-to" type="date" value={newsTo} min={newsFrom || undefined} onChange={(e) => pickNews({ to: e.target.value })} /></div>
        {newsRange && <button className="btn sm" type="button" onClick={() => setNewsRange(null)}>Bỏ lọc</button>}</div></div>
      {nlp.error && <div className="note bad" role="alert">{nlp.error}</div>}
      <div className="news">{nlp.ranged?.items.map(newsItem)}
        {!nlp.ranged ? !nlp.error && <p className="muted">Đang tải tin…</p> : !nlp.ranged.items.length && <p className="muted">Không có tin của mã {symbol} trong khoảng ngày đã chọn.</p>}</div>
      <div className="small muted" style={{ marginTop: 8 }}>Mới nhất trước. Cảm xúc chấm bằng PhoBERT (AI_Core).</div>
    </section>}

    {tab === 'hist' && <section className="card"><div className="card-h"><h2>Lịch sử giá theo phiên</h2><span className="small muted">{prices.sourceStatus === 'live' ? 'Nguồn SSI' : 'Dữ liệu minh họa'} · giá khớp thực tế; +/− so với tham chiếu (đã tính chia cổ tức, thưởng cổ phiếu)</span></div>
      <div className="tw" style={{ maxHeight: 520, overflowY: 'auto' }}><table><thead><tr><th>Ngày</th><th className="r">Mở cửa</th><th className="r">Cao</th><th className="r">Thấp</th><th className="r">Đóng cửa</th><th className="r">+/−</th><th className="r">%</th><th className="r">Khối lượng</th><th className="r">Giá trị (tỷ)</th></tr></thead>
        <tbody>{stats.history.map((row) => <tr key={row.date}><td className="num">{formatDate(row.date)}</td>
          <td className="r num">{row.open == null ? '—' : money.format(row.open)}</td><td className="r num">{row.high == null ? '—' : money.format(row.high)}</td>
          <td className="r num">{row.low == null ? '—' : money.format(row.low)}</td><td className={`r num ${signClass(row.change)}`}>{money.format(row.close)}</td>
          <td className={`r num ${signClass(row.change)}`}>{row.change == null ? '—' : `${row.change > 0 ? '+' : row.change < 0 ? '−' : ''}${money.format(Math.abs(row.change))}`}</td>
          <td className={`r num ${signClass(row.change)}`}>{formatPercent(row.changePercent)}</td>
          <td className="r num">{row.volume == null ? '—' : money.format(row.volume)}</td><td className="r num">{row.turnover == null ? '—' : billions.format(row.turnover / 1e9)}</td></tr>)}
          {!stats.history.length && <tr><td colSpan="9" className="muted">Chưa có dữ liệu giá.</td></tr>}</tbody></table></div>
    </section>}
  </main>;
}

// FR-M2-07: data completeness of the symbol (price freshness, recent news).
function DataStatusChips({ flags }) {
  if (!flags) return <span className="muted">—</span>;
  if (!flags.stalePrice && !flags.missingNews) return <span className="chip up">Đầy đủ</span>;
  return <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    {flags.stalePrice && <span className="chip down">Dữ liệu cũ</span>}
    {flags.missingNews && <span className="chip hold">Thiếu tin</span>}
  </span>;
}

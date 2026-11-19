import { RISK_TEXT, UNSURE_NOTE, relationText, sentimentOf } from '@stocksense/core/news';

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const BARS = [['positive', 'up', 'Tích cực'], ['neutral', 'hold', 'Trung tính'], ['negative', 'down', 'Tiêu cực']];
const percent = (value) => `${Math.round(value * 100)}%`;

// One article: a compact row; clicking it opens the model's detail (probabilities, passage, risk flags, source link).
// The title button only carries the keyboard semantics: its click bubbles to the row.
// Open/closed state lives in the page, keyed by article id, so it survives list reloads.
export function NlpNewsItem({ item, symbol, open, onToggle }) {
  const sentiment = sentimentOf(item);
  const { probabilities } = item;
  return <article className="nlp-item">
    <div className="nlp-head" onClick={onToggle}>
      <h4><button type="button" className="nlp-title" aria-expanded={open}>{item.title}</button></h4>
      <div className="meta">{item.source} · <span className="num">{dateTime.format(new Date(item.publishedAt))}</span></div>
      <div className="nlp-chips">
        <span className={`chip ${sentiment.tone === 'unsure' ? 'neutral' : sentiment.tone}`}>{sentiment.text}</span>
        <span className="chip info">{relationText(item.relation, symbol)}</span>
        {item.riskFlags.map((flag) => <span key={flag} className="chip down">{RISK_TEXT[flag] ?? flag}</span>)}
      </div>
    </div>
    {open && <div className="nlp-panel">
      <div className="prob-bar" role="img" aria-label={BARS.map(([key, , name]) => `${name} ${percent(probabilities[key])}`).join(', ')}>
        {BARS.map(([key, tone]) => <i key={key} className={tone} style={{ width: `${probabilities[key] * 100}%` }} />)}</div>
      <div className="nlp-probs small">{BARS.map(([key, tone, name]) => <span key={key}><i className={`dot ${tone}`} />{name} <b className="num">{percent(probabilities[key])}</b></span>)}</div>
      {item.uncertain && <div className="note info small">{UNSURE_NOTE}</div>}
      {item.passage && <p className="nlp-passage">{item.passage}</p>}
      <div className="small muted">Cờ rủi ro: {item.riskFlags.length ? item.riskFlags.map((flag) => RISK_TEXT[flag] ?? flag).join(', ') : 'không có'} · Mô hình {item.modelVersion}
        {item.url && <> · <a href={item.url} target="_blank" rel="noopener noreferrer">Mở bài gốc ↗</a></>}</div>
    </div>}
  </article>;
}

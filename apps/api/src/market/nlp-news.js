// Pure helpers for the nlp_news endpoints (no DB access). Vietnam is UTC+7 with no DST.
const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const vnDate = (ms) => new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
// 00:00 VN of a YYYY-MM-DD day as epoch ms, or NaN when it is not a real calendar day.
function vnMidnight(day) {
  if (!DATE.test(day)) return NaN;
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== day ? NaN : ms - VN_OFFSET_MS;
}

// Half-open [start, end): 00:00 VN of `from` up to 00:00 VN of the day after `to`.
export function vnDayRange(from, to) {
  return { start: new Date(vnMidnight(from)).toISOString(), end: new Date(vnMidnight(to) + DAY_MS).toISOString() };
}

export function defaultRange(now) {
  const to = vnDate(now.getTime());
  return { from: vnDate(now.getTime() - 7 * DAY_MS), to };
}

// UTC window of the default list range; recentNews counts the same articles the default list shows.
export function defaultWindow(now) {
  const { from, to } = defaultRange(now);
  return vnDayRange(from, to);
}

export function parseRange(query, now) {
  const base = defaultRange(now);
  const from = query?.from ?? base.from;
  const to = query?.to ?? base.to;
  if (Number.isNaN(vnMidnight(from)) || Number.isNaN(vnMidnight(to)) || from > to) return null;
  return { from, to };
}

export function mapNlpNews(row) {
  return {
    id: row.document_id, title: row.title,
    url: row.source === 'hose' ? null : row.url, // HOSE links are JSON API URLs, not readable pages
    source: row.source, publishedAt: row.published_at.toISOString(), relation: row.relation,
    probabilities: { positive: row.p_pos, neutral: row.p_neu, negative: row.p_neg },
    uncertain: row.uncertain, riskFlags: row.risk_flags, passage: row.passage, modelVersion: row.model_version,
  };
}

const TONES = [['positive', 'up', 'Tích cực'], ['neutral', 'hold', 'Trung tính'], ['negative', 'down', 'Tiêu cực']];

export const RISK_TEXT = Object.freeze({
  guarantee: 'Bảo lãnh nợ',
  seizure: 'Kê biên / phong tỏa',
  prosecution: 'Khởi tố / điều tra',
  sanction: 'Xử phạt / hạn chế GD',
  bond_default: 'Chậm trả trái phiếu',
});

export const UNSURE_NOTE = 'Model không đủ tự tin để gán nhãn; bài này không được tính vào điểm cảm xúc của mã.';

export function sentimentOf({ uncertain, probabilities }) {
  if (uncertain) return { tone: 'unsure', text: 'Chưa chắc' };
  const [key, tone, name] = TONES.reduce((best, row) => (probabilities[row[0]] > probabilities[best[0]] ? row : best));
  return { tone, text: `${name} ${Math.round(probabilities[key] * 100)}%` };
}

export function relationText(relation, symbol) {
  return { direct: `Nói trực tiếp về ${symbol}`, sector: 'Tin ngành', market: 'Tin thị trường chung', ambiguous: 'Liên quan chưa rõ' }[relation] ?? '';
}

// Same default window as the API (apps/api/src/market/nlp-news.js): today in VN time (UTC+7, no DST) minus 7 days.
const vnDate = (ms) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
export function defaultRange(now = Date.now()) {
  const ms = Number(now);
  return { from: vnDate(ms - 7 * 86_400_000), to: vnDate(ms) };
}

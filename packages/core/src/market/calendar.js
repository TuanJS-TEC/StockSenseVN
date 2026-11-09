// Trading-calendar helpers shared by web, mobile and API. Dates are ISO strings (YYYY-MM-DD) in Vietnam time.

// FR-M2-03: adds trading days to an ISO date, skipping weekends and exchange holidays (from /market/status).
export function addTradingDays(isoDate, days, holidays = []) {
  if (!isoDate) return null;
  const closed = new Set(holidays);
  const date = new Date(`${isoDate}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const iso = date.toISOString().slice(0, 10);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !closed.has(iso)) left -= 1;
  }
  return date.toISOString().slice(0, 10);
}

// FR-M4-06 cut-off: an article published at or after 15:00 (ICT) counts for the next day.
export function newsSession(publishedAt) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(publishedAt)).map((part) => [part.type, part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (Number(parts.hour) < 15) return day;
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

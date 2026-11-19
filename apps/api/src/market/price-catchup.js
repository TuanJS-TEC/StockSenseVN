import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keeps daily_prices filled up to the last closed session without anyone running `worker:market:sync` by hand:
// every check looks at each enabled symbol's newest SSI bar and runs the worker's SSI sync for what is missing —
// a full history for symbols with none yet (empty database, newly enabled symbol), then the missing days of lagging ones.
// Forecasts (pushed by AI_Core daily) need the close of their own session to anchor the price band on.
// The sync holds a PostgreSQL advisory lock, so it never overlaps the admin-jobs watcher's 15:30 run.
const WORKER_CLI = fileURLToPath(new URL('../../../worker/src/cli.js', import.meta.url));
const CLOSE_MINUTES = 15 * 60 + 30; // same cut-off as the admin-jobs daily pipeline
const RUN_TIMEOUT_MS = 40 * 60_000;
const HISTORY_YEARS = 5; // first-load depth, like the original manual load (2021-10-27..)
const RETRY_AFTER_CLEAN_MS = 60 * 60_000; // SSI may publish the day's bar late; an unlisted holiday never gets one

const shiftDay = (iso, days) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Newest session whose end-of-day bar should exist: today after 15:30 ICT on a trading day, else the trading day before.
export function lastClosedSession(now = new Date(), holidays = []) {
  const closed = new Set(holidays);
  const trading = (iso) => ![0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay()) && !closed.has(iso);
  const vn = new Date(now.getTime() + 7 * 3600_000);
  let iso = vn.toISOString().slice(0, 10);
  if (trading(iso) && vn.getUTCHours() * 60 + vn.getUTCMinutes() >= CLOSE_MINUTES) return iso;
  do iso = shiftDay(iso, -1); while (!trading(iso));
  return iso;
}

// Next sync to run from each enabled symbol's newest SSI date (null = no history): symbols without history first,
// then lagging ones from their oldest missing day. `symbols` is null when the run covers every enabled symbol
// (that run also syncs the indices). Returns null when everything is up to date.
export function planSync(latestBySymbol, now = new Date(), holidays = []) {
  const to = lastClosedSession(now, holidays);
  const entries = Object.entries(latestBySymbol);
  const empty = entries.filter(([, latest]) => !latest).map(([symbol]) => symbol);
  const behind = entries.filter(([, latest]) => latest && latest < to);
  let plan = null;
  if (empty.length) plan = { from: `${Number(to.slice(0, 4)) - HISTORY_YEARS}${to.slice(4)}`, symbols: empty };
  else if (behind.length) plan = { from: shiftDay(behind.map(([, latest]) => latest).sort()[0], 1), symbols: behind.map(([symbol]) => symbol) };
  if (!plan) return null;
  return { from: plan.from, to, symbols: plan.symbols.length === entries.length ? null : plan.symbols.sort() };
}

export function startPriceCatchup(pool, { intervalMs = 15 * 60_000, spawnImpl = spawn, logger = console } = {}) {
  let child = null;
  let timer = null;
  let stopped = false;
  const cleanRuns = new Map(); // plan key -> time of its last clean run

  async function check() {
    if (child || stopped) return null;
    const { rows } = await pool.query(`SELECT s.symbol,
        (SELECT max(p.trade_date)::text FROM daily_prices p WHERE p.symbol = s.symbol AND p.source = 'ssi') AS latest,
        ARRAY(SELECT holiday::text FROM market_holidays
          WHERE holiday >= timezone('Asia/Ho_Chi_Minh', now())::date - 30) AS holidays
      FROM symbols s WHERE s.is_enabled = true`);
    if (!rows.length) return null;
    const plan = planSync(Object.fromEntries(rows.map((row) => [row.symbol, row.latest])), new Date(), rows[0].holidays);
    const key = plan && `${plan.from}..${plan.to}:${plan.symbols?.join(',') ?? '*'}`;
    if (!plan || Date.now() - (cleanRuns.get(key) ?? -Infinity) < RETRY_AFTER_CLEAN_MS) return null;
    logger.info?.(`[StockSense API] syncing SSI daily prices ${plan.from}..${plan.to} for ${plan.symbols?.join(',') ?? 'all symbols'}.`);
    const args = [WORKER_CLI, '--from', plan.from, '--to', plan.to, ...(plan.symbols ? ['--symbols', plan.symbols.join(',')] : [])];
    child = spawnImpl(process.execPath, args, { env: process.env, stdio: 'inherit' });
    const kill = setTimeout(() => child?.kill('SIGTERM'), RUN_TIMEOUT_MS);
    child.on('exit', (code) => {
      clearTimeout(kill);
      child = null;
      // 0 = succeeded, 2 = partial (some symbols failed: retried at the next check), 1 = failed.
      logger[code === 0 ? 'info' : 'warn']?.(`[StockSense API] price sync ${key} exited with ${code}.`);
      if (code === 0) { cleanRuns.set(key, Date.now()); setImmediate(run); } // go on with the next group, if any
    });
    child.on('error', (error) => { clearTimeout(kill); child = null; logger.error?.('[StockSense API] price sync failed to start', error); });
    return plan;
  }

  const run = () => check().catch((error) => logger.error?.('[StockSense API] price sync check failed', error));
  if (intervalMs > 0) { run(); timer = setInterval(run, intervalMs); }
  return { check, stop() { stopped = true; clearInterval(timer); child?.kill('SIGTERM'); } };
}

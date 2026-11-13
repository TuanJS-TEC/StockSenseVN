// Fan-out of PostgreSQL `LISTEN nlp_news` notifications (payload "FPT,VNM") to per-symbol subscribers.
export function createNewsHub() {
  const subscribers = new Map(); // symbol -> Set<fn>
  return {
    subscribe(symbol, fn) {
      const key = symbol.toUpperCase();
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key).add(fn);
      return () => {
        const set = subscribers.get(key);
        set?.delete(fn);
        if (set?.size === 0) subscribers.delete(key);
      };
    },
    publish(payload) {
      for (const symbol of String(payload ?? '').split(',')) {
        for (const fn of [...(subscribers.get(symbol.trim().toUpperCase()) ?? [])]) {
          try { fn(); } catch (error) { console.error('[StockSense API] news subscriber failed', error); }
        }
      }
    },
  };
}

// Holds one dedicated pool client in LISTEN state; on error/end it drops that client and reconnects after retryMs.
export function startNewsListener(pool, hub, { retryMs = 5000 } = {}) {
  let client = null;
  let timer = null;
  let stopped = false;

  const drop = () => {
    const old = client;
    client = null;
    if (!old) return;
    old.removeAllListeners('notification');
    old.release(true); // true: destroy the connection instead of returning a LISTENing client to the pool
  };
  const retry = () => {
    drop();
    if (!stopped && !timer) timer = setTimeout(() => { timer = null; connect(); }, retryMs);
  };
  async function connect() {
    if (stopped) return;
    try {
      const next = await pool.connect();
      if (stopped) { next.release(true); return; }
      client = next;
      next.on('notification', (message) => hub.publish(message.payload));
      next.on('error', (error) => { if (client === next) { console.error('[StockSense API] nlp_news listener error', error); retry(); } });
      next.on('end', () => { if (client === next) retry(); });
      await next.query('LISTEN nlp_news');
    } catch (error) {
      console.error('[StockSense API] nlp_news listener failed to start', error);
      retry();
    }
  }

  connect(); // never rejects: failures schedule a retry
  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      drop();
    },
  };
}

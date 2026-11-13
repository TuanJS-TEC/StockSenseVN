import { useEffect, useRef, useState } from 'react';
import { defaultRange } from '@stocksense/core/news';
import { api } from '../../api/index.js';

const EMPTY = { ranged: null, recent: null, times: null, error: '' };

// News of one symbol: the list for the chosen day range, the default 7-day list, and every publish time
// (for the chart dots). The realtime stream triggers a refetch of all of it on each `news` event and on each
// (re)connect (`range` is null while the user has not picked dates: every fetch then uses today's default window), because events sent while the stream was down are not replayed. Refetches never overlap:
// events that arrive during one are coalesced into a single follow-up. Failed requests keep the old data.
export function useNlpNews(symbol, enabled, range, onFlags) {
  const [state, setState] = useState(EMPTY);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const flagsRef = useRef(onFlags);
  flagsRef.current = onFlags;
  const rangedSeq = useRef(0); // only the newest ranged request may land

  const fetchRanged = () => {
    const { from, to } = rangeRef.current ?? defaultRange();
    if (!from || !to) return Promise.resolve(undefined); // half-typed date input
    const id = ++rangedSeq.current;
    return api.symbols.nlpNews(symbol, { from, to }).then((result) => (id === rangedSeq.current ? { ranged: result, error: '' } : undefined),
      (requestError) => (id === rangedSeq.current ? { error: requestError.message || 'Không tải được tin tức.' } : undefined));
  };

  useEffect(() => {
    if (!enabled) return undefined;
    setState(EMPTY);
    let active = true; let busy = false; let again = false;
    const keep = (patch) => active && patch && setState((prev) => ({ ...prev, ...patch }));
    const refresh = async () => {
      if (busy) { again = true; return; }
      busy = true;
      try {
        do {
          again = false;
          await Promise.all([
            fetchRanged().then(keep),
            api.symbols.nlpNews(symbol).then((recent) => keep({ recent }), () => {}),
            api.symbols.nlpNewsTimes(symbol).then((times) => keep({ times }), () => {}),
            flagsRef.current?.(),
          ]);
        } while (again && active);
      } finally { busy = false; }
    };
    // First load (the ranged list is loaded by the effect below): the page already has fresh flags, and the
    // stream's own `open` event triggers the full refresh.
    api.symbols.nlpNews(symbol).then((recent) => keep({ recent }), () => {});
    api.symbols.nlpNewsTimes(symbol).then((times) => keep({ times }), () => {});
    const close = api.symbols.newsStream(symbol, refresh);
    return () => { active = false; rangedSeq.current += 1; close(); };
  }, [symbol, enabled]);

  // Symbol or range changed: only the ranged list.
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    fetchRanged().then((patch) => active && patch && setState((prev) => ({ ...prev, ...patch })));
    return () => { active = false; };
  }, [symbol, enabled, range?.from, range?.to]);

  return state;
}

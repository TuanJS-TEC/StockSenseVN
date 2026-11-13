import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createNewsHub, startNewsListener } from './news-hub.js';

describe('news hub', () => {
  it('routes payload symbols to their subscribers only', () => {
    const hub = createNewsHub();
    const fpt = vi.fn(); const vnm = vi.fn(); const acb = vi.fn();
    hub.subscribe('FPT', fpt); hub.subscribe('VNM', vnm); hub.subscribe('ACB', acb);
    hub.publish('FPT,VNM');
    expect(fpt).toHaveBeenCalledTimes(1);
    expect(vnm).toHaveBeenCalledTimes(1);
    expect(acb).not.toHaveBeenCalled();
  });

  it('unsubscribe stops delivery', () => {
    const hub = createNewsHub();
    const fn = vi.fn();
    const off = hub.subscribe('FPT', fn);
    off();
    hub.publish('FPT');
    expect(fn).not.toHaveBeenCalled();
  });

  it('startNewsListener reconnects after error', async () => {
    const clients = [];
    const pool = {
      connect: vi.fn(async () => {
        const c = Object.assign(new EventEmitter(), { query: vi.fn(async () => {}), release: vi.fn() });
        clients.push(c);
        return c;
      }),
    };
    const hub = { publish: vi.fn() };
    const listener = await startNewsListener(pool, hub, { retryMs: 10 });
    await vi.waitFor(() => expect(clients[0].query).toHaveBeenCalledWith('LISTEN nlp_news'));
    clients[0].emit('error', new Error('boom'));
    await vi.waitFor(() => expect(clients).toHaveLength(2));
    expect(clients[0].release).toHaveBeenCalled();
    await vi.waitFor(() => expect(clients[1].query).toHaveBeenCalledWith('LISTEN nlp_news'));
    clients[1].emit('notification', { channel: 'nlp_news', payload: 'FPT' });
    expect(hub.publish).toHaveBeenCalledWith('FPT');
    await listener.stop();
    expect(clients[1].release).toHaveBeenCalled();
  });
});

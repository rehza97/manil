type TerminalSocketListener = {
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  onMessage?: (ev: MessageEvent) => void;
};

type TerminalSocketEntry = {
  ws: WebSocket;
  listeners: Set<TerminalSocketListener>;
  refCount: number;
  closeTimer: number | null;
};

const sockets = new Map<string, TerminalSocketEntry>();

function ensureEntry(key: string, url: string): TerminalSocketEntry {
  const existing = sockets.get(key);
  if (existing && existing.ws.readyState !== WebSocket.CLOSED) {
    if (existing.closeTimer) {
      window.clearTimeout(existing.closeTimer);
      existing.closeTimer = null;
    }
    return existing;
  }

  const ws = new WebSocket(url);
  const entry: TerminalSocketEntry = {
    ws,
    listeners: existing?.listeners ?? new Set(),
    refCount: existing?.refCount ?? 0,
    closeTimer: null,
  };

  ws.onopen = () => {
    for (const l of entry.listeners) l.onOpen?.();
  };
  ws.onmessage = (ev) => {
    for (const l of entry.listeners) l.onMessage?.(ev);
  };
  ws.onerror = (ev) => {
    for (const l of entry.listeners) l.onError?.(ev);
  };
  ws.onclose = (ev) => {
    for (const l of entry.listeners) l.onClose?.(ev);
  };

  sockets.set(key, entry);
  return entry;
}

export function attachTerminalSocket(
  key: string,
  url: string,
  listener: TerminalSocketListener,
  // Default: keep connection alive across tab switches for a long time.
  closeGraceMs: number = 10 * 60_000
) {
  const entry = ensureEntry(key, url);

  entry.refCount += 1;
  entry.listeners.add(listener);

  const send = (payload: string) => {
    if (entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(payload);
    }
  };

  const detach = () => {
    entry.listeners.delete(listener);
    entry.refCount = Math.max(0, entry.refCount - 1);

    if (entry.refCount === 0 && entry.ws.readyState === WebSocket.OPEN) {
      entry.closeTimer = window.setTimeout(() => {
        try {
          entry.ws.close();
        } catch {
          // ignore
        } finally {
          sockets.delete(key);
        }
      }, closeGraceMs);
    }
  };

  return { ws: entry.ws, send, detach };
}



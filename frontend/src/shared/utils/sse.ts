/**
 * Minimal SSE client over fetch()
 *
 * We use fetch instead of EventSource so we can attach Authorization headers.
 */
export type SSEMessage = {
  event: string;
  data: string;
};

type StreamSSEOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onOpen?: () => void;
  onMessage: (msg: SSEMessage) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
};

export async function streamSSE(url: string, opts: StreamSSEOptions): Promise<void> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(opts.headers ?? {}),
      },
      signal: opts.signal,
    });

    if (!res.ok) {
      throw new Error(`SSE request failed: ${res.status} ${res.statusText}`);
    }
    if (!res.body) {
      throw new Error("SSE response has no body");
    }

    opts.onOpen?.();

    reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      try {
        const { value, done } = await reader.read();

        if (done) {
          // Stream ended normally
          console.log("[SSE] Stream ended normally");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        // Parse SSE frames separated by blank line
        let idx = buffer.indexOf("\n\n");
        while (idx !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // Skip keepalive comments (lines starting with :)
          if (frame.startsWith(":")) {
            idx = buffer.indexOf("\n\n");
            continue;
          }

          let event = "message";
          const dataLines: string[] = [];

          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).replace(/^ /, ""));
            }
          }

          const data = dataLines.join("\n");

          // Handle close event from server
          if (event === "close") {
            console.log("[SSE] Server sent close event:", data);
            opts.onClose?.();
            return;
          }

          if (data.length > 0 || event !== "message") {
            try {
              opts.onMessage({ event, data });
            } catch (e) {
              opts.onError?.(e);
            }
          }

          idx = buffer.indexOf("\n\n");
        }
      } catch (readError) {
        // Check if this is an abort error (user cancelled)
        if (opts.signal?.aborted) {
          console.log("[SSE] Stream aborted by user");
          break;
        }
        // Otherwise, re-throw the error
        throw readError;
      }
    }

    // Stream completed successfully
    opts.onClose?.();
  } catch (error) {
    // Check if this is an abort error (user cancelled)
    if (opts.signal?.aborted) {
      console.log("[SSE] Connection aborted");
      opts.onClose?.();
      return;
    }

    console.error("[SSE] Stream error:", error);
    opts.onError?.(error);
    throw error;
  } finally {
    // Always cleanup the reader
    if (reader) {
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore lock release errors
        console.warn("[SSE] Failed to release reader lock:", e);
      }
    }
  }
}




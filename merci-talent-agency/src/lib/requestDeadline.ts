/** Bound both the request and body decoding, even if a transport ignores abort. */
export async function withDeadline<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 15_000,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let abort: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort();
      reject(new Error('Request cancelled'));
    };
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out. Please retry.'));
    }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new Error('Request cancelled');
        return request(controller.signal);
      }),
      cancelled,
    ]);
  } finally {
    clearTimeout(timer!);
    signal?.removeEventListener('abort', abort!);
  }
}

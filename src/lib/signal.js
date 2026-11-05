// An AbortSignal that fires after `ms`, so no request can hang (and freeze whatever waits on it).
// Uses the native AbortSignal.timeout where available (Chrome 103+, Safari 16+, Firefox 100+),
// a timer otherwise. A late-firing timer on a finished request is a harmless no-op.
export function timeoutSignal(ms) {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
  return controller.signal;
}

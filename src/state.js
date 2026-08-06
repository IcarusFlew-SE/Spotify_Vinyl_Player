const listeners = new Set();

export const state = {
    isConnected: false,
    isPlaying: false,
    trackTitle: null,
    trackArtist: null,
    trackImage: null,
    timerMode: 'focus',        // 'focus' | 'break'
    timerSecondsLeft: 25 * 60,
    timerRunning: false,
}

export function setState(patch) {
    Object.assign(state, patch);
    listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn); // unsubscribe handle
}
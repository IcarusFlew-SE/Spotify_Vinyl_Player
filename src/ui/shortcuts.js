// Keyboard shortcuts: Space play/pause, ←/→ previous/next, T start/pause timer
export function mountShortcuts({ onTogglePlay, onNext, onPrev, onToggleTimer }) {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target;
    if (target.closest?.('input, textarea, select, [contenteditable="true"]')) return;

    switch (e.key) {
      case ' ':
        // Space on a focused button/link already activates it — don't double-fire
        if (target.closest?.('button, a, summary')) return;
        e.preventDefault();
        onTogglePlay();
        break;
      case 'ArrowRight':
        onNext();
        break;
      case 'ArrowLeft':
        onPrev();
        break;
      case 't':
      case 'T':
        onToggleTimer();
        break;
    }
  });
}

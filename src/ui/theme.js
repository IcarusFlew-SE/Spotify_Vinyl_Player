import { subscribe } from '../state.js';

// The only code that writes theme custom properties and page-state attributes on <html>.
export function mountTheme() {
  const root = document.documentElement;
  let appliedKeys = [];

  subscribe('theme', ({ vars }) => {
    for (const key of appliedKeys) {
      if (!vars || !(key in vars)) root.style.removeProperty(key);
    }
    if (vars) for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    appliedKeys = vars ? Object.keys(vars) : [];
  });

  // CSS shows the account chip or its skeleton from this
  subscribe('auth', ({ status }) => {
    root.dataset.auth = status;
  });
}

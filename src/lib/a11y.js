import { useEffect, useState } from 'react';

const STORAGE_KEY = 'health-app-a11y';
const LEGACY_THEME_KEY = 'health-app-theme';

export const FONT_SCALES = [0.875, 1, 1.125, 1.25, 1.5];

const DEFAULTS = {
  theme: 'system',
  highContrast: false,
  fontScale: 1,
  reducedMotion: false,
  underlineLinks: false,
  largeCursor: false,
  letterSpacing: 0,
  lineHeight: 1
};

const listeners = new Set();
let current = { ...DEFAULTS };
let bootstrapped = false;

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  const legacyTheme = (() => {
    try { return window.localStorage.getItem(LEGACY_THEME_KEY); } catch { return null; }
  })();
  if (legacyTheme === 'dark' || legacyTheme === 'light') {
    return { ...DEFAULTS, theme: legacyTheme };
  }
  return { ...DEFAULTS };
}

function writeStorage(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (state.theme === 'dark' || state.theme === 'light') {
      window.localStorage.setItem(LEGACY_THEME_KEY, state.theme);
    }
  } catch {
    // ignore
  }
}

export function applyA11y(state = current) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  let resolvedTheme = state.theme;
  if (resolvedTheme === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    resolvedTheme = prefersDark ? 'dark' : 'light';
  }
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('a11y-high-contrast', !!state.highContrast);
  root.classList.toggle('a11y-reduced-motion', !!state.reducedMotion);
  root.classList.toggle('a11y-underline-links', !!state.underlineLinks);
  root.classList.toggle('a11y-large-cursor', !!state.largeCursor);
  root.style.setProperty('--a11y-font-scale', String(state.fontScale || 1));
  root.style.setProperty('--a11y-letter-spacing', `${state.letterSpacing || 0}px`);
  root.style.setProperty('--a11y-line-height', String(state.lineHeight || 1));
  root.style.fontSize = `${(state.fontScale || 1) * 100}%`;
}

function notify() {
  for (const listener of listeners) listener(current);
}

export function bootstrapA11y() {
  if (bootstrapped || typeof window === 'undefined') return;
  bootstrapped = true;
  current = readStorage();
  applyA11y(current);

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = readStorage();
    applyA11y(current);
    notify();
  });

  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (mql) {
    const onChange = () => {
      if (current.theme === 'system') applyA11y(current);
    };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }
}

export function getA11y() {
  if (!bootstrapped && typeof window !== 'undefined') bootstrapA11y();
  return current;
}

export function setA11y(patch) {
  if (!bootstrapped && typeof window !== 'undefined') bootstrapA11y();
  current = { ...current, ...patch };
  writeStorage(current);
  applyA11y(current);
  notify();
}

export function resetA11y() {
  setA11y({ ...DEFAULTS });
}

export function subscribeA11y(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useA11y() {
  const [state, setState] = useState(() => getA11y());
  useEffect(() => subscribeA11y(setState), []);
  return state;
}

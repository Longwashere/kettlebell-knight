import { IS_NATIVE_APP } from './native';

/**
 * Video graphics setting (title screen menu). PERFORMANCE trades a few effects for frame rate on weak Fire TV
 * GPUs (Mali-G31 sticks run battle at ~25 fps with everything on). It sets `data-gfx` on <html>; the CSS
 * overrides live under `:root[data-gfx='performance']` in src/index.css, and GameEngine checks
 * `isPerformanceMode()` for its own savers (the default monster outline pass).
 */
export type GraphicsMode = 'QUALITY' | 'PERFORMANCE';

const STORAGE_KEY = 'kk_graphics_mode';

// The Fire TV app starts in PERFORMANCE; browsers (desktop /tv demo) keep the full effects.
let mode: GraphicsMode = IS_NATIVE_APP ? 'PERFORMANCE' : 'QUALITY';

function apply(): void {
  document.documentElement.dataset.gfx = mode.toLowerCase();
}

/** Reads the saved setting and applies it. Call once at startup, before the first render. */
export function installGraphicsMode(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'QUALITY' || saved === 'PERFORMANCE') mode = saved;
  } catch {
    // Storage blocked: keep the default.
  }
  apply();
}

export function getGraphicsMode(): GraphicsMode {
  return mode;
}

export function isPerformanceMode(): boolean {
  return mode === 'PERFORMANCE';
}

export function setGraphicsMode(next: GraphicsMode): void {
  mode = next;
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage blocked: the setting lasts for this session only.
  }
}

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/** True inside the packaged Fire TV app (Capacitor Android shell), false in a browser. */
export const IS_NATIVE_APP = Capacitor.isNativePlatform();

/** CSS width the TV screens are laid out for (a 1080p desktop browser, as `npm run shot` renders them). */
const TV_LAYOUT_WIDTH = 1920;

/**
 * Fire TV reports 2x density, so `width=device-width` gives the WebView a 960x540 CSS viewport and every
 * px-sized overlay renders twice as big. Lay out at 1920 CSS px instead; MainActivity enables the wide
 * viewport so the WebView zooms that to fit the screen.
 */
export function installTvViewport(): void {
  if (!IS_NATIVE_APP) return;
  document.querySelector('meta[name="viewport"]')
    ?.setAttribute('content', `width=${TV_LAYOUT_WIDTH}, user-scalable=no`);
}

/** Closes the Fire TV app. Amazon requires Back on the top-level screen to exit; in a browser this does nothing. */
export function exitApp(): void {
  if (IS_NATIVE_APP) App.exitApp();
}

/**
 * Android hands the remote's Back button to the activity, so the WebView never sees a keydown for it.
 * Re-dispatch it as the Fire OS Back key (keyCode 4) that useTVRemote and the screens already handle.
 * The top-level screens (title menu, hub) call exitApp() themselves; an unhandled Back does nothing, so a
 * press during a transition can't close the game.
 */
export function installNativeBackButton(): void {
  if (!IS_NATIVE_APP) return;
  App.addListener('backButton', () => {
    const event = new KeyboardEvent('keydown', { key: 'GoBack', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { get: () => 4 });
    Object.defineProperty(event, 'which', { get: () => 4 });
    window.dispatchEvent(event);
  });
}

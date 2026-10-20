import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/** True inside the packaged Fire TV app (Capacitor Android shell), false in a browser. */
export const IS_NATIVE_APP = Capacitor.isNativePlatform();

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

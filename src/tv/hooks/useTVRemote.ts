import { useEffect, useRef } from 'react';
import { audioManager } from '../../shared/AudioManager';

export interface TVRemoteHandlers {
  onSelect?: () => void;
  onBack?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onDemoSwing?: () => void; // Triggered by KeyCode 179 (Play/Pause) or Spacebar
}

export interface TVRemoteOptions {
  enabled?: boolean;
  playAudioFeedback?: boolean;
}

// Fire TV / Vega OS KeyCodes
export const TV_KEYCODES = {
  ENTER: 13,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  FIRE_OS_BACK: 4,
  VEGA_OS_BACK: 27, // ESC
  BACKSPACE: 8,
  MEDIA_PLAY_PAUSE: 179,
  SPACEBAR: 32,
} as const;

/**
 * Custom React hook for Amazon Fire TV (Vega OS / Fire OS) 10-foot remote D-pad input.
 * Supports D-Pad arrows (37-40), Select/Enter (13), Fire OS Back (4), Vega OS Back / Esc (27),
 * and Play/Pause (179) or Spacebar for headless demo mode swings.
 */
export function useTVRemote(
  handlers: TVRemoteHandlers,
  options: TVRemoteOptions = { enabled: true, playAudioFeedback: true }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const enabled = options.enabled ?? true;
  const playAudio = options.playAudioFeedback ?? true;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      const key = e.key;

      let handled = false;

      // Enter / Select (13)
      if (code === TV_KEYCODES.ENTER || key === 'Enter') {
        if (handlersRef.current.onSelect) {
          if (playAudio) audioManager.play('ui_select');
          handlersRef.current.onSelect();
          handled = true;
        }
      }
      // Fire OS Back (4) or Vega OS Back (27 / Escape)
      else if (
        code === TV_KEYCODES.FIRE_OS_BACK ||
        code === TV_KEYCODES.VEGA_OS_BACK ||
        code === TV_KEYCODES.BACKSPACE ||
        key === 'Escape' ||
        key === 'Backspace'
      ) {
        if (handlersRef.current.onBack) {
          if (playAudio) audioManager.play('ui_move');
          handlersRef.current.onBack();
          handled = true;
        }
      }
      // D-Pad Up (38)
      else if (code === TV_KEYCODES.UP || key === 'ArrowUp') {
        if (handlersRef.current.onUp) {
          if (playAudio) audioManager.play('ui_move');
          handlersRef.current.onUp();
          handled = true;
        }
      }
      // D-Pad Down (40)
      else if (code === TV_KEYCODES.DOWN || key === 'ArrowDown') {
        if (handlersRef.current.onDown) {
          if (playAudio) audioManager.play('ui_move');
          handlersRef.current.onDown();
          handled = true;
        }
      }
      // D-Pad Left (37)
      else if (code === TV_KEYCODES.LEFT || key === 'ArrowLeft') {
        if (handlersRef.current.onLeft) {
          if (playAudio) audioManager.play('ui_move');
          handlersRef.current.onLeft();
          handled = true;
        }
      }
      // D-Pad Right (39)
      else if (code === TV_KEYCODES.RIGHT || key === 'ArrowRight') {
        if (handlersRef.current.onRight) {
          if (playAudio) audioManager.play('ui_move');
          handlersRef.current.onRight();
          handled = true;
        }
      }
      // Play/Pause (179) or Spacebar (32) -> Headless Demo Mode swing trigger
      else if (
        code === TV_KEYCODES.MEDIA_PLAY_PAUSE ||
        code === TV_KEYCODES.SPACEBAR ||
        key === ' ' ||
        key === 'MediaPlayPause'
      ) {
        if (handlersRef.current.onDemoSwing) {
          handlersRef.current.onDemoSwing();
          handled = true;
        }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, playAudio]);
}

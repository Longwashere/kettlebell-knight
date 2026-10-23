import React, { useEffect, useState } from 'react';
import { networkManager } from '../../shared/NetworkManager';
import { BodyVisibilityPayload, REQUIRED_BODY_PARTS } from '../../types/game';
import { registerDebug } from '../debug/agentBridge';

const PART_LABELS: Record<string, string> = {
  SHOULDERS: 'Shoulders',
  'ARMS / HANDS': 'Hands',
  HIPS: 'Hips',
  KNEES: 'Knees',
};

/**
 * Shown while the bound phone's camera can't see the whole knight (its reps don't count then):
 * asks them to step back and lists the body parts the camera looks for, marking the ones it can't see.
 * The phone only reports this once its camera is running (resending it every second); it resets to in sight when
 * the phone unpairs or goes quiet for a few seconds (NetworkManager).
 */
export const BodyFramingNotice: React.FC<{ active: boolean; zoom: number }> = ({ active, zoom }) => {
  const [visibility, setVisibility] = useState<BodyVisibilityPayload>({ visible: true, missing: [] });

  useEffect(() => networkManager.onBodyVisibility(setVisibility), []);

  useEffect(() => registerDebug('framing', () => visibility, {
    // Dev: pretend the phone lost sight of these parts (none = back in frame), e.g. framing('KNEES', 'HIPS')
    framing: (...parts: string[]) => setVisibility({ visible: parts.length === 0, missing: parts }),
  }), [visibility]);

  if (!active || visibility.visible) return null;

  const nobody = visibility.missing.includes('ALL JOINTS');
  return (
    <div className="kk-framing" role="alert" style={{ zoom }}>
      <div className="kk-framing__title">Step back, knight</div>
      <p className="kk-framing__sub">
        {nobody
          ? 'The camera cannot see you. Step into view so it sees your whole body.'
          : 'The camera cannot see your whole body. Step back so it sees:'}
      </p>
      <ul className="kk-framing__parts">
        {REQUIRED_BODY_PARTS.map((part) => {
          const missing = nobody || visibility.missing.includes(part);
          return (
            <li key={part} className={missing ? 'kk-framing__part kk-framing__part--missing' : 'kk-framing__part'}>
              <i>{missing ? '✕' : '✓'}</i>
              {PART_LABELS[part]}
            </li>
          );
        })}
      </ul>
      <p className="kk-framing__hint">Reps won't count until it can.</p>
    </div>
  );
};

/**
 * Dev-only recorder for monster moves (used by `__kk.moveCheck` / `npm run shot -- movecheck`).
 *
 * When GameEngine.debugMonsterMove() arms a tracer, playMonsterMove reports into it every frame:
 * the impact frame, lesser knight hits, animation names the rig doesn't have, whether any move
 * graphics or the monster itself touched the knight just before impact, and how the monster was
 * left when the timeline ended. `findings()` turns that into errors and warnings.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MoveEndState {
  offX: number;
  offY: number;
  lift: number;
  alpha: number;
  tint: number;
  rotation: number;
  scaleX: number; // relative to rest scale (1 = untouched)
  scaleY: number;
}

export interface MoveTraceReport {
  move: string;
  length: number; // timeline length in 60 fps frames
  impactFrame: number | null;
  chipFrames: number[];
  vfx: string[]; // Spine VFX rigs the move played
  offscreenFrames: number;
  errors: string[];
  warnings: string[];
}

const CONTACT_WINDOW = 8; // frames up to impact in which something already on screen must reach the knight
const LONG_MOVE = 180; // frames; moves longer than ~3 s drag in battle

const overlaps = (a: Box, b: Box, pad = 0) =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

export class MoveTracer {
  length = 0;
  done = false;
  private impactFrame: number | null = null;
  private fallbackImpact = false;
  private chips: number[] = [];
  private missing = new Set<string>();
  private contactFrames: number[] = [];
  private offscreen = 0;
  private end: MoveEndState | null = null;
  private error: string | null = null;
  private cancelled = false;

  constructor(readonly move: string, readonly selfTarget: boolean) {}

  private vfxUsed = new Set<string>();

  vfx(name: string): void {
    this.vfxUsed.add(name);
  }

  missingAnim(name: string): void {
    this.missing.add(name);
  }

  chip(frame: number): void {
    this.chips.push(Math.round(frame));
  }

  impact(frame: number, fallback: boolean): void {
    if (this.impactFrame !== null) return;
    this.impactFrame = Math.round(frame);
    this.fallbackImpact = fallback;
  }

  /**
   * Per-frame sample. `fx` are the bounds of every live move graphic (fx and ground layers), `monster`
   * the rig, `knight` the knight, `screen` the canvas, all in the same (global) space.
   */
  sample(frame: number, fx: Box[], monster: Box | null, knight: Box, screen: Box): void {
    const touching = fx.some((b) => b.w > 0 && b.h > 0 && overlaps(b, knight)) || (monster !== null && overlaps(monster, knight, 40));
    if (touching) this.contactFrames.push(Math.round(frame));
    if (monster && !overlaps(monster, screen)) this.offscreen++;
  }

  finish(end: MoveEndState | null, cancelled: boolean): void {
    this.end = end;
    this.cancelled = cancelled;
    this.done = true;
  }

  fail(err: unknown): void {
    this.error ??= err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  report(): MoveTraceReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (this.error) errors.push(`threw ${this.error}`);
    if (this.cancelled) errors.push('cancelled before it finished');
    if (this.impactFrame === null) errors.push('never landed');
    else if (this.fallbackImpact) errors.push('timeline never called h.impact(); it landed only when the move ended');
    for (const name of this.missing) warnings.push(`h.anim('${name}'): rig has no such animation (ignored)`);

    const hit = this.impactFrame;
    if (hit !== null && !this.fallbackImpact && !this.selfTarget) {
      const reached = this.contactFrames.some((f) => f >= hit - CONTACT_WINDOW && f <= hit);
      if (!reached) warnings.push(`impact @f${hit}: nothing visibly reached the knight in the ${CONTACT_WINDOW} frames up to it`);
    }
    if (hit !== null) {
      const late = this.chips.filter((f) => f > hit);
      if (late.length) warnings.push(`lesser hits after the impact (@f${late.join(', f')}) — damage label shows before them`);
    }
    if (this.end) {
      const e = this.end;
      const off: string[] = [];
      if (Math.hypot(e.offX, e.offY) > 1.5) off.push(`offset ${e.offX.toFixed(0)},${e.offY.toFixed(0)}`);
      if (Math.abs(e.lift) > 1.5) off.push(`lift ${e.lift.toFixed(0)}`);
      if (e.alpha < 0.98) off.push(`alpha ${e.alpha.toFixed(2)}`);
      if (e.tint !== 0xFFFFFF) off.push(`tint #${e.tint.toString(16).padStart(6, '0')}`);
      if (Math.abs(e.rotation) > 0.02) off.push(`tilt ${e.rotation.toFixed(2)}`);
      if (Math.abs(e.scaleX - 1) > 0.03 || Math.abs(e.scaleY - 1) > 0.03) off.push(`stretch ${e.scaleX.toFixed(2)}x${e.scaleY.toFixed(2)}`);
      if (off.length) warnings.push(`ends away from rest (${off.join(', ')}) — snaps back on the last frame`);
    }
    if (this.length > LONG_MOVE) warnings.push(`long: ${this.length} frames (${(this.length / 60).toFixed(1)}s)`);
    return {
      move: this.move,
      length: Math.round(this.length),
      impactFrame: this.impactFrame,
      chipFrames: this.chips,
      vfx: [...this.vfxUsed],
      offscreenFrames: this.offscreen,
      errors,
      warnings,
    };
  }
}

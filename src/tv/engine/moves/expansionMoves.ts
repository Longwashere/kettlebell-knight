/**
 * Expansion monster moves:
 * - Crypt Crawler & Plague Rat (Cathedral Crypt)
 * - Ember Serpent & Cinder Imp (Volcanic Forge)
 * - Thorn Stalker (Dark Forest)
 * - Giant Crab & Sewer Lurker (Sunken Cistern)
 * - Giant Beetle & Forest Bear (Verdant Forest)
 * - Cultist Acolyte (Eldritch Altar)
 * - Lantern Wisp (Blood Cemetery)
 * - Throne Guardian (Obsidian Throne)
 * - Storm Crow (Belfry Ramparts)
 * - Vault Hound (Cathedral Vault)
 * - Rogue Bard (Town Square)
 */
import type { Graphics } from 'pixi.js';
import type { MonsterMoveId } from '../../../types/battle';
import {
  lerp, easeIn, easeOut, easeInOut, arc,
  INK, BONE, BLOOD, EMBER, GOLD, DIRT, FIRE,
} from '../choreo';
import * as fx from '../fxKit';
import {
  type MoveFn, contact, chest, head, travel, drawSpan, projectile, clawRake, jaws, spike, orb,
  retreat, land, chip, warnRing, shoutRings, hexWard, guard, dart,
} from '../monsterKit';

const POISON = [0x65A30D, 0xA3E635, 0x3F6212];
const SOUL = [0x38BDF8, 0x0284C7, 0xE0F2FE];
const SHADOW = [0x581C87, 0x7E22CE, 0xC084FC];
const ACID = [0x84CC16, 0x4D7C0F, 0xBEF264];
const BRINE = [0x06B6D4, 0x0891B2, 0xCFFAFE];
const STORM = [0x60A5FA, 0x93C5FD, 0x1D4ED8];

// =============================================================================================
// CRYPT CRAWLER (Cathedral Crypt)
// anims: attack, dash, dead, hurt, idle, run, walk

const crawlerMandiblePinch: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('walk');
    h.sound('chitter');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeOut);
  tl.at(16, () => {
    h.anim('attack');
    h.sound('chomp');
  });
  drawSpan(h, tl, 16, 26, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x44403C, 0x78716C);
  });
  tl.at(22, () => land(h, { kb: 10, shake: 6, colors: [0x57534E, 0x292524, BONE], sound: 'chomp' }));
  tl.at(30, () => h.anim('walk'));
  retreat(h, tl, 30, 48, c);
  tl.at(48, () => h.idle());
  tl.end(50);
};

const crawlerBurrowDash: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('dash');
    h.sound('chitter');
  });
  warnRing(h, tl, 4, 18, 0x78716C);
  tl.during(0, 10, (t) => h.offset(0, lerp(0, 30, easeIn(t))));
  tl.at(10, () => {
    h.offset(c.x, 30);
    h.sound('crack');
  });
  tl.at(14, () => h.anim('attack'));
  tl.during(10, 18, (t) => h.offset(c.x, lerp(30, 0, easeOut(t))));
  tl.at(20, () => land(h, { kb: 14, shake: 10, zoom: 1.15, colors: [...DIRT, 0x44403C, BONE], sound: 'impact_heavy' }));
  tl.at(28, () => h.anim('walk'));
  retreat(h, tl, 28, 46, c);
  tl.at(46, () => h.idle());
  tl.end(48);
};

const crawlerAcidSpurt: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack');
    h.sound('spit');
  });
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 18, (g, x, y) => {
    orb(g, x, y, 7, ACID);
  }, () => {
    land(h, { kb: 8, shake: 7, colors: ACID, sound: 'splat' });
  });
  tl.at(30, () => h.idle());
  tl.end(32);
};

const crawlerChitinShell: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0x78716C, 0x44403C, BONE], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 32 * grow).stroke({ width: 3, color: 0x78716C, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// PLAGUE RAT (Cathedral Crypt)
// anims: attack_01, attack_02, die, hit, idle

const ratFrenziedGnaw: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.sound('screech', { rate: 1.4 });
    h.anim('attack_01');
  });
  travel(h, tl, 0, 12, { x: 0, y: 0 }, c, easeOut);
  tl.at(14, () => land(h, { kb: 7, shake: 5, colors: POISON, sound: 'claw' }));
  retreat(h, tl, 20, 34, c);
  tl.at(34, () => h.idle());
  tl.end(36);
};

const ratPlagueBite: MoveFn = (h, tl) => {
  const c = contact(h, 22);
  tl.at(0, () => {
    h.anim('attack_02');
    h.sound('screech', { rate: 1.2 });
  });
  travel(h, tl, 2, 16, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 14, 24, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x166534, 0x4D7C0F);
  });
  tl.at(20, () => land(h, { kb: 12, shake: 9, zoom: 1.15, colors: [...POISON, BLOOD], sound: 'chomp' }));
  retreat(h, tl, 28, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

const ratFilthSlash: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('attack_01');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  drawSpan(h, tl, 10, 20, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 20, 0x4D7C0F);
  });
  tl.at(16, () => land(h, { kb: 8, shake: 6, colors: POISON, sound: 'claw' }));
  retreat(h, tl, 22, 38, c);
  tl.at(38, () => h.idle());
  tl.end(40);
};

// =============================================================================================
// EMBER SERPENT (Volcanic Forge)
// anims: Fly, Fly2, Hover, Branch/Idle, Ground/Idle

const serpentEmberStrike: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('Fly');
    h.sound('whoosh', { rate: 1.3 });
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeIn);
  drawSpan(h, tl, 12, 22, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 24, 0xF97316);
  });
  tl.at(18, () => land(h, { kb: 11, shake: 8, colors: FIRE, sound: 'impact' }));
  retreat(h, tl, 24, 42, c);
  tl.at(42, () => h.idle());
  tl.end(44);
};

const serpentLavaSpit: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Fly');
    h.sound('fire');
  });
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 18, (g, x, y) => {
    orb(g, x, y, 8, FIRE);
  }, () => {
    land(h, { kb: 10, shake: 8, colors: FIRE, sound: 'explosion' });
  });
  tl.at(28, () => h.idle());
  tl.end(30);
};

const serpentInfernoCoil: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('Fly2');
    h.sound('fire');
    h.sound('whoosh');
  });
  warnRing(h, tl, 4, 20, FIRE[0]);
  travel(h, tl, 4, 20, { x: 0, y: 0 }, c, easeInOut);
  tl.at(22, () => land(h, { kb: 15, shake: 11, zoom: 1.2, colors: FIRE, sound: 'impact_heavy' }));
  retreat(h, tl, 32, 54, c);
  tl.at(54, () => h.idle());
  tl.end(56);
};

// =============================================================================================
// CINDER IMP (Volcanic Forge)
// anims: hit, idle, walk

const impCinderFireball: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('hit');
    h.sound('fire');
  });
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 18, (g, x, y) => {
    orb(g, x, y, 6, [0xEF4444, EMBER, 0xF59E0B]);
  }, () => {
    land(h, { kb: 9, shake: 7, colors: FIRE, sound: 'explosion' });
  });
  tl.at(28, () => h.idle());
  tl.end(30);
};

const impScorchClaw: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('walk');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  tl.at(14, () => h.anim('hit'));
  drawSpan(h, tl, 12, 22, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 18, 0xEF4444);
  });
  tl.at(18, () => land(h, { kb: 8, shake: 6, colors: [0xEF4444, EMBER], sound: 'claw' }));
  retreat(h, tl, 24, 40, c);
  tl.at(40, () => h.idle());
  tl.end(42);
};

const impHellfireEruption: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('hit');
    h.sound('fire');
  });
  warnRing(h, tl, 4, 22, FIRE[0]);
  drawSpan(h, tl, 20, 32, (g, t) => {
    const p = chest(h);
    g.circle(p.x, p.y + 10, 24 * arc(t)).fill({ color: FIRE[0], alpha: 0.7 * (1 - t) });
  });
  tl.at(22, () => land(h, { kb: 13, shake: 10, zoom: 1.15, colors: FIRE, sound: 'impact_heavy' }));
  tl.at(34, () => h.idle());
  tl.end(36);
};

// =============================================================================================
// THORN STALKER (Dark Forest)
// anims: idle, idle_mannerism_v1, idle_mannerism_v2, pose_attack, pose_defend, pose_hurt, pose_death

const stalkerThornVolley: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('idle_mannerism_v1');
    h.sound('whoosh');
  });
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 12, (g, x, y) => {
    dart(g, x, y, Math.PI, 14, 0x15803D, 0x86EFAC);
  }, () => {
    land(h, { kb: 9, shake: 6, colors: [0x15803D, 0x4ADE80, BONE], sound: 'stab' });
  });
  tl.at(28, () => h.idle());
  tl.end(30);
};

const stalkerBrambleLash: MoveFn = (h, tl) => {
  const c = contact(h, 32);
  tl.at(0, () => {
    h.anim('idle_mannerism_v2');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 12, 24, (g) => {
    spike(g, chest(h).x, chest(h).y + 10, 22, 12, 0x166534, 0x15803D);
  });
  tl.at(18, () => land(h, { kb: 11, shake: 8, colors: [0x166534, 0x15803D, BONE], sound: 'lash' }));
  retreat(h, tl, 26, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

const stalkerNeedleBarrage: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('idle_mannerism_v1');
    h.sound('whoosh');
  });
  [12, 18, 24].forEach((f) => {
    tl.at(f, () => chip(h, [0x15803D, BONE], 4, 3, 'stab'));
  });
  tl.at(28, () => land(h, { kb: 14, shake: 9, zoom: 1.15, colors: [0x15803D, 0x4ADE80, BONE], sound: 'impact_heavy' }));
  tl.at(38, () => h.idle());
  tl.end(40);
};

const stalkerPricklyGuard: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0x15803D, 0x166534, BONE], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 32 * grow).stroke({ width: 3, color: 0x15803D, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// GIANT CRAB (Sunken Cistern)
// anims: attack_01, attack_02, die, hit, idle

const crabPincerSnap: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('attack_01');
    h.sound('chitter');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  drawSpan(h, tl, 10, 20, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x0891B2, 0x06B6D4);
  });
  tl.at(16, () => land(h, { kb: 10, shake: 7, colors: [0x0891B2, 0x06B6D4, BONE], sound: 'crack' }));
  retreat(h, tl, 22, 38, c);
  tl.at(38, () => h.idle());
  tl.end(40);
};

const crabCrushingClamp: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('attack_02');
    h.sound('impact_heavy');
  });
  travel(h, tl, 4, 20, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 16, 28, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x0E7490, 0x0891B2);
  });
  tl.at(24, () => land(h, { kb: 15, shake: 11, zoom: 1.18, colors: [0x0891B2, BONE], sound: 'impact_heavy' }));
  retreat(h, tl, 32, 50, c);
  tl.at(50, () => h.idle());
  tl.end(52);
};

const crabBubbleBlast: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('attack_01');
    h.sound('splash');
  });
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 16, (g, x, y) => {
    orb(g, x, y, 7, BRINE);
  }, () => {
    land(h, { kb: 8, shake: 6, colors: BRINE, sound: 'splash' });
  });
  tl.at(28, () => h.idle());
  tl.end(30);
};

const crabChitinGuard: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0x0891B2, 0x0E7490, BONE], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 32 * grow).stroke({ width: 3, color: 0x0891B2, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// SEWER LURKER (Sunken Cistern)
// anims: Action, Idle, Lose, Lose2 Burn, Thirsty Action

const lurkerLureStrike: MoveFn = (h, tl) => {
  const c = contact(h, 32);
  tl.at(0, () => {
    h.anim('Action');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeIn);
  drawSpan(h, tl, 12, 22, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 24, 0x0284C7);
  });
  tl.at(18, () => land(h, { kb: 11, shake: 8, colors: [0x0284C7, 0x38BDF8, BONE], sound: 'chomp' }));
  retreat(h, tl, 26, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

const lurkerAbyssalBite: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('Thirsty Action');
    h.sound('splash');
  });
  warnRing(h, tl, 4, 22, 0x0284C7);
  travel(h, tl, 6, 22, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 18, 30, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x0369A1, 0x0284C7);
  });
  tl.at(26, () => land(h, { kb: 16, shake: 12, zoom: 1.2, colors: [0x0284C7, 0x075985, BONE], sound: 'impact_heavy' }));
  retreat(h, tl, 36, 56, c);
  tl.at(56, () => h.idle());
  tl.end(58);
};

const lurkerSludgeBelch: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('Action');
    h.sound('gurgle');
  });
  projectile(h, tl, 8, 16, () => h.pos(), () => chest(h), 16, (g, x, y) => {
    orb(g, x, y, 8, [0x166534, 0x4ADE80, 0x86EFAC]);
  }, () => {
    land(h, { kb: 10, shake: 7, colors: [0x166534, 0x4ADE80], sound: 'splat' });
  });
  tl.at(30, () => h.idle());
  tl.end(32);
};

// =============================================================================================
// GIANT BEETLE (Verdant Forest)
// anims: attack, dash, dead, hurt, idle, run, walk

const beetleHornToss: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('walk');
    h.sound('chitter');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeOut);
  tl.at(16, () => {
    h.anim('attack');
    h.sound('impact_heavy');
  });
  drawSpan(h, tl, 14, 26, (g) => {
    spike(g, chest(h).x, chest(h).y + 10, 24, 12, 0x44403C, 0x57534E);
  });
  tl.at(22, () => land(h, { kb: 13, shake: 9, colors: [0x57534E, 0x292524, BONE], sound: 'impact_heavy' }));
  tl.at(30, () => h.anim('walk'));
  retreat(h, tl, 30, 48, c);
  tl.at(48, () => h.idle());
  tl.end(50);
};

const beetleChitinSlam: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('dash');
    h.sound('chitter');
  });
  travel(h, tl, 2, 18, { x: 0, y: 0 }, c, easeIn);
  tl.at(18, () => {
    h.anim('attack');
    land(h, { kb: 15, shake: 11, zoom: 1.18, colors: [0x44403C, ...DIRT, BONE], sound: 'impact_heavy' });
  });
  tl.at(28, () => h.anim('walk'));
  retreat(h, tl, 28, 48, c);
  tl.at(48, () => h.idle());
  tl.end(50);
};

const beetleCarapaceWall: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0x57534E, 0x44403C, BONE], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 32 * grow).stroke({ width: 3, color: 0x57534E, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// FOREST BEAR (Verdant Forest)
// anims: animation

const bearCrushingSwipe: MoveFn = (h, tl) => {
  const c = contact(h, 30);
  tl.at(0, () => {
    h.anim('animation');
    h.sound('roar', { rate: 0.9 });
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeOut);
  drawSpan(h, tl, 12, 24, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 26, 0x78350F);
  });
  tl.at(18, () => land(h, { kb: 12, shake: 9, colors: [0x78350F, 0x92400E, BLOOD], sound: 'claw' }));
  retreat(h, tl, 26, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

const bearGrizzlyMaul: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('animation');
    h.sound('roar', { rate: 0.8 });
  });
  travel(h, tl, 4, 22, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 18, 28, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x78350F, BLOOD);
  });
  tl.at(24, () => land(h, { kb: 16, shake: 12, zoom: 1.2, colors: [0x78350F, BLOOD, BONE], sound: 'impact_heavy' }));
  retreat(h, tl, 34, 54, c);
  tl.at(54, () => h.idle());
  tl.end(56);
};

const bearTerritorialRoar: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('animation');
    h.sound('roar');
  });
  drawSpan(h, tl, 4, 24, (g, t) => {
    shoutRings(g, h.pos().x - 10, head(h).y, t, 0xD97706, 3, h.pos().x - h.knight.x + 10);
  });
  tl.at(20, () => land(h, { kb: 9, shake: 7, colors: [0xD97706, 0xFBBF24], sound: 'impact_heavy' }));
  tl.at(30, () => h.idle());
  tl.end(32);
};

// =============================================================================================
// CULTIST ACOLYTE (Eldritch Altar)
// anims: active_attack, active_end, active_hit, active_idle, active_start, passive_idle

const acolyteVoidDagger: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('active_attack');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  tl.at(16, () => land(h, { kb: 9, shake: 6, colors: SHADOW, sound: 'stab' }));
  retreat(h, tl, 22, 38, c);
  tl.at(38, () => h.idle());
  tl.end(40);
};

const acolyteEldritchHex: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('active_attack');
    h.sound('zap');
  });
  drawSpan(h, tl, 4, 22, (g, t) => {
    hexWard(g, chest(h).x, chest(h).y, 20 * t, 0, SHADOW[1], SHADOW[2]);
  });
  tl.at(20, () => land(h, { kb: 10, shake: 7, colors: SHADOW, sound: 'magic' }));
  tl.at(28, () => h.idle());
  tl.end(30);
};

const acolyteSacrificialBlast: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('active_attack');
    h.sound('zap');
  });
  warnRing(h, tl, 4, 22, SHADOW[0]);
  projectile(h, tl, 8, 14, () => h.pos(), () => chest(h), 16, (g, x, y) => {
    orb(g, x, y, 8, SHADOW);
  }, () => {
    land(h, { kb: 14, shake: 10, zoom: 1.15, colors: SHADOW, sound: 'explosion' });
  });
  tl.at(30, () => h.idle());
  tl.end(32);
};

const acolyteShadowWard: MoveFn = (h, tl) => {
  guard(h, tl, 0, SHADOW, (g, cx, cy, grow, fade) => {
    hexWard(g, cx, cy, 32 * grow, 0, SHADOW[1], SHADOW[2], fade);
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// LANTERN WISP (Blood Cemetery)
// anims: soul

const wispSoulFlame: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('soul');
    h.sound('fire', { rate: 1.3 });
  });
  projectile(h, tl, 6, 14, () => h.pos(), () => chest(h), 14, (g, x, y) => {
    orb(g, x, y, 7, SOUL);
  }, () => {
    land(h, { kb: 8, shake: 6, colors: SOUL, sound: 'magic' });
  });
  tl.at(26, () => h.idle());
  tl.end(28);
};

const wispSpectralBurn: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('soul');
    h.sound('fire');
  });
  warnRing(h, tl, 4, 22, SOUL[0]);
  drawSpan(h, tl, 18, 30, (g, t) => {
    const p = chest(h);
    g.circle(p.x, p.y, 22 * arc(t)).fill({ color: SOUL[0], alpha: 0.8 * (1 - t) });
  });
  tl.at(24, () => land(h, { kb: 13, shake: 9, zoom: 1.15, colors: SOUL, sound: 'explosion' }));
  tl.at(32, () => h.idle());
  tl.end(34);
};

const wispSpiritVeil: MoveFn = (h, tl) => {
  guard(h, tl, 0, SOUL, (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 28 * grow).stroke({ width: 2, color: SOUL[0], alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// THRONE GUARDIAN (Obsidian Throne)
// anims: atk, die, idle, move

const guardianColossalCleave: MoveFn = (h, tl) => {
  const c = contact(h, 34);
  tl.at(0, () => {
    h.anim('move');
    h.sound('impact_heavy');
  });
  travel(h, tl, 0, 20, { x: 0, y: 0 }, c, easeInOut);
  tl.at(20, () => {
    h.anim('atk');
    h.sound('whoosh', { rate: 0.8 });
  });
  drawSpan(h, tl, 16, 28, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 10, p.y, 28, -Math.PI * 0.7, Math.PI * 0.6, 6, fx.pal(0x1E293B, 0x94A3B8), 1 - t);
  });
  tl.at(26, () => land(h, { kb: 14, shake: 10, colors: [0x1E293B, 0x475569, BONE], sound: 'impact_heavy' }));
  retreat(h, tl, 36, 56, c);
  tl.at(56, () => h.idle());
  tl.end(58);
};

const guardianThroneSmash: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('move');
    h.sound('impact_heavy');
  });
  warnRing(h, tl, 6, 26, 0x334155);
  travel(h, tl, 4, 24, { x: 0, y: 0 }, c, easeInOut);
  tl.at(24, () => {
    h.anim('atk');
    h.sound('stomp');
  });
  tl.at(30, () => land(h, { kb: 18, shake: 14, zoom: 1.25, colors: [0x0F172A, 0x334155, BONE], sound: 'impact_heavy' }));
  retreat(h, tl, 42, 64, c);
  tl.at(64, () => h.idle());
  tl.end(66);
};

const guardianObsidianBulwark: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0x334155, 0x0F172A, BONE], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 36 * grow).stroke({ width: 4, color: 0x334155, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================
// STORM CROW (Belfry Ramparts)
// anims: attack, death, hurt, posture, run, stand

const crowDiveBomb: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('attack');
    h.sound('caw', { rate: 1.2 });
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  tl.at(16, () => land(h, { kb: 10, shake: 7, colors: [STORM[0], BONE], sound: 'claw' }));
  retreat(h, tl, 22, 38, c);
  tl.at(38, () => h.idle());
  tl.end(40);
};

const crowTempestScreech: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('posture');
    h.sound('caw');
  });
  drawSpan(h, tl, 4, 22, (g, t) => {
    shoutRings(g, h.pos().x - 10, head(h).y, t, STORM[0], 3, h.pos().x - h.knight.x + 10);
  });
  tl.at(20, () => land(h, { kb: 9, shake: 7, colors: STORM, sound: 'zap' }));
  tl.at(28, () => h.idle());
  tl.end(30);
};

const crowGaleSlash: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('attack');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 16, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 12, 24, (g) => {
    clawRake(g, chest(h).x, chest(h).y, -1, 22, STORM[1]);
  });
  tl.at(18, () => land(h, { kb: 13, shake: 9, zoom: 1.15, colors: STORM, sound: 'claw' }));
  retreat(h, tl, 26, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

// =============================================================================================
// VAULT HOUND (Cathedral Vault)
// anims: attack, death, hurt, posture, run, skill1, stand

const houndVaultPounce: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('run');
    h.sound('growl', { rate: 1.2 });
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeIn);
  tl.at(14, () => h.anim('attack'));
  tl.at(18, () => land(h, { kb: 11, shake: 8, colors: [0x78716C, BLOOD, BONE], sound: 'chomp' }));
  retreat(h, tl, 26, 42, c);
  tl.at(42, () => h.idle());
  tl.end(44);
};

const houndIronJaw: MoveFn = (h, tl) => {
  const c = contact(h, 24);
  tl.at(0, () => {
    h.anim('skill1');
    h.sound('growl');
  });
  travel(h, tl, 4, 18, { x: 0, y: 0 }, c, easeInOut);
  drawSpan(h, tl, 14, 26, (g, t) => {
    jaws(g, chest(h).x, chest(h).y, t, 0x57534E, BLOOD);
  });
  tl.at(22, () => land(h, { kb: 15, shake: 11, zoom: 1.18, colors: [0x57534E, BLOOD, BONE], sound: 'chomp' }));
  retreat(h, tl, 30, 48, c);
  tl.at(48, () => h.idle());
  tl.end(50);
};

const houndGuardFrenzy: MoveFn = (h, tl) => {
  const c = contact(h, 26);
  tl.at(0, () => {
    h.anim('attack');
    h.sound('growl');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  tl.at(14, () => chip(h, [BLOOD, BONE], 4, 3, 'claw'));
  tl.at(20, () => land(h, { kb: 12, shake: 8, colors: [BLOOD, BONE], sound: 'chomp' }));
  retreat(h, tl, 28, 44, c);
  tl.at(44, () => h.idle());
  tl.end(46);
};

// =============================================================================================
// BARD (Town Square)
// anims: idle_aggressive, idle_aggressive_mannerism, pose_attack_v1, pose_cast_spell_v1, pose_defend, pose_hurt, pose_death

const bardDissonantChord: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('idle_aggressive_mannerism');
    h.sound('magic', { rate: 1.2 });
  });
  drawSpan(h, tl, 4, 22, (g, t) => {
    shoutRings(g, h.pos().x - 12, chest(h).y, t, 0xE11D48, 3, h.pos().x - h.knight.x + 10);
  });
  tl.at(18, () => land(h, { kb: 9, shake: 6, colors: [0xE11D48, 0xFDA4AF, GOLD], sound: 'magic' }));
  tl.at(28, () => h.idle());
  tl.end(30);
};

const bardCuttingBallad: MoveFn = (h, tl) => {
  const c = contact(h, 28);
  tl.at(0, () => {
    h.anim('pose_attack_v1');
    h.sound('whoosh');
  });
  travel(h, tl, 0, 14, { x: 0, y: 0 }, c, easeOut);
  drawSpan(h, tl, 10, 20, (g, t) => {
    const p = chest(h);
    fx.crescent(g, p.x + 8, p.y, 22, -Math.PI * 0.6, Math.PI * 0.5, 5, fx.pal(0xE11D48, 0xFFE4E6), 1 - t);
  });
  tl.at(16, () => land(h, { kb: 10, shake: 7, colors: [0xE11D48, BONE], sound: 'slash' }));
  retreat(h, tl, 22, 38, c);
  tl.at(38, () => h.idle());
  tl.end(40);
};

const bardCacophony: MoveFn = (h, tl) => {
  tl.at(0, () => {
    h.anim('pose_cast_spell_v1');
    h.sound('magic');
  });
  warnRing(h, tl, 4, 22, 0xE11D48);
  drawSpan(h, tl, 16, 28, (g, t) => {
    shoutRings(g, chest(h).x, chest(h).y, t, 0xBE123C, 4, 60);
  });
  tl.at(24, () => land(h, { kb: 14, shake: 10, zoom: 1.15, colors: [0xE11D48, 0xF43F5E, GOLD], sound: 'impact_heavy' }));
  tl.at(34, () => h.idle());
  tl.end(36);
};

const bardTempoWard: MoveFn = (h, tl) => {
  guard(h, tl, 0, [0xE11D48, 0xFDA4AF, GOLD], (g, cx, cy, grow, fade) => {
    g.circle(cx, cy, 30 * grow).stroke({ width: 3, color: 0xE11D48, alpha: 0.8 * fade });
  });
  tl.at(50, () => h.idle());
  tl.end(52);
};

// =============================================================================================

export const EXPANSION_MOVES = {
  crawler_mandible_pinch: crawlerMandiblePinch,
  crawler_burrow_dash: crawlerBurrowDash,
  crawler_acid_spurt: crawlerAcidSpurt,
  crawler_chitin_shell: crawlerChitinShell,

  rat_frenzied_gnaw: ratFrenziedGnaw,
  rat_plague_bite: ratPlagueBite,
  rat_filth_slash: ratFilthSlash,

  serpent_ember_strike: serpentEmberStrike,
  serpent_lava_spit: serpentLavaSpit,
  serpent_inferno_coil: serpentInfernoCoil,

  imp_cinder_fireball: impCinderFireball,
  imp_scorch_claw: impScorchClaw,
  imp_hellfire_eruption: impHellfireEruption,

  stalker_thorn_volley: stalkerThornVolley,
  stalker_bramble_lash: stalkerBrambleLash,
  stalker_needle_barrage: stalkerNeedleBarrage,
  stalker_prickly_guard: stalkerPricklyGuard,

  crab_pincer_snap: crabPincerSnap,
  crab_crushing_clamp: crabCrushingClamp,
  crab_bubble_blast: crabBubbleBlast,
  crab_chitin_guard: crabChitinGuard,

  lurker_lure_strike: lurkerLureStrike,
  lurker_abyssal_bite: lurkerAbyssalBite,
  lurker_sludge_belch: lurkerSludgeBelch,

  beetle_horn_toss: beetleHornToss,
  beetle_chitin_slam: beetleChitinSlam,
  beetle_carapace_wall: beetleCarapaceWall,

  bear_crushing_swipe: bearCrushingSwipe,
  bear_grizzly_maul: bearGrizzlyMaul,
  bear_territorial_roar: bearTerritorialRoar,

  acolyte_void_dagger: acolyteVoidDagger,
  acolyte_eldritch_hex: acolyteEldritchHex,
  acolyte_sacrificial_blast: acolyteSacrificialBlast,
  acolyte_shadow_ward: acolyteShadowWard,

  wisp_soul_flame: wispSoulFlame,
  wisp_spectral_burn: wispSpectralBurn,
  wisp_spirit_veil: wispSpiritVeil,

  guardian_colossal_cleave: guardianColossalCleave,
  guardian_throne_smash: guardianThroneSmash,
  guardian_obsidian_bulwark: guardianObsidianBulwark,

  crow_dive_bomb: crowDiveBomb,
  crow_tempest_screech: crowTempestScreech,
  crow_gale_slash: crowGaleSlash,

  hound_vault_pounce: houndVaultPounce,
  hound_iron_jaw: houndIronJaw,
  hound_guard_frenzy: houndGuardFrenzy,

  bard_dissonant_chord: bardDissonantChord,
  bard_cutting_ballad: bardCuttingBallad,
  bard_cacophony: bardCacophony,
  bard_tempo_ward: bardTempoWard,
};

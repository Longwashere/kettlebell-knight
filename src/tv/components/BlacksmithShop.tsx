import React, { useEffect, useMemo, useState } from 'react';
import { EquipmentItem } from '../../types/game';
import type { CardTemplate } from '../../types/battle';
import { SHOP_ITEMS } from '../../shared/shopItems';
import { isSecretTrialId } from '../../shared/secretTrials';
import { SECRET_TRIAL_COPY } from './secretTrialCopy';
import { ELEMENT_INFO } from '../../shared/elements';
import { SPELL_MASTERY_LEVEL, WEAPON_MAX_LEVEL, bindCard, castsForWeaponLevel, levelProgress, weaponLevel, weaponLevelReq, weaponStats } from '../../shared/progression';
import { loadoutFor, type PlayerProfile } from '../../shared/ProfileManager';
import { spellsForWeapon } from '../../types/weaponSpells';
import { TARGET_LABEL } from '../../shared/cardBalance';
import { ASSET_ROOT } from '../../shared/assetRoot';
import { CardFront, cardStyleVars } from './CombatCardView';

export { SHOP_ITEMS };

/** How a stone-bound weapon's lock reads in the shop: its trial's words and colour. */
const sealedCopy = (id: string) => (isSecretTrialId(id) ? SECRET_TRIAL_COPY[id] : SECRET_TRIAL_COPY.excalibell);

/**
 * The forge's racks: one tab per weapon type, plus the armoury for shields, helms and plate. Each rack runs
 * from the lowest tier up, with the weapons sealed in secret trials hung last.
 */
const RACKS = [
  { id: 'morningstar', label: 'Morning Stars', glyph: '✶' },
  { id: 'bell', label: 'Bells', glyph: '♁' },
  { id: 'mace', label: 'Maces', glyph: '⚒' },
  { id: 'sword', label: 'Swords', glyph: '†' },
  { id: 'armour', label: 'Armoury', glyph: '⛨' },
] as const;

const rackOf = (item: EquipmentItem) => (item.slot === 'weapon' ? item.weaponType ?? 'bell' : 'armour');

const RACK_ITEMS: number[][] = RACKS.map((rack) =>
  SHOP_ITEMS.map((item, i) => ({ item, i }))
    .filter(({ item }) => rackOf(item) === rack.id)
    .sort((a, b) => Number(!!a.item.stoneBound) - Number(!!b.item.stoneBound) || a.item.level - b.item.level || a.item.price - b.item.price)
    .map(({ i }) => i),
);

const locate = (index: number) => {
  const rack = Math.max(0, RACK_ITEMS.findIndex((r) => r.includes(index)));
  return { rack, row: Math.max(0, RACK_ITEMS[rack].indexOf(index)) };
};

/** D-pad step through the forge (a SHOP_ITEMS index): ▲▼ along a rack, ◀▶ between racks. */
export function forgeNavigate(index: number, dir: 'up' | 'down' | 'left' | 'right'): number {
  const { rack, row } = locate(index);
  if (dir === 'up' || dir === 'down') {
    const items = RACK_ITEMS[rack];
    return items[Math.min(items.length - 1, Math.max(0, row + (dir === 'down' ? 1 : -1)))];
  }
  const next = (rack + (dir === 'right' ? 1 : -1) + RACKS.length) % RACKS.length;
  return RACK_ITEMS[next][0];
}

const RARITY = {
  common: { label: 'Common', color: '#B8B2A7' },
  rare: { label: 'Rare', color: '#5CC3FF' },
  epic: { label: 'Epic', color: '#C98BFF' },
  legendary: { label: 'Legendary', color: '#F4B41A' },
} as const;

const TYPE_LABEL: Record<string, string> = { morningstar: 'Morning Star', bell: 'Kettlebell', mace: 'Mace', sword: 'Sword' };
const SLOT_GLYPH: Record<string, string> = { shield: '⛨', helmet: '♛', armor: '⛊' };

/** The design height the forge is laid out at; it zooms to the real viewport so 720p and the TV's 1080p match. */
const DESIGN_H = 720;

function useDesignZoom(): number {
  const [zoom, setZoom] = useState(() => window.innerHeight / DESIGN_H);
  useEffect(() => {
    const onResize = () => setZoom(window.innerHeight / DESIGN_H);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return zoom;
}

/** A weapon as the knight holds it (cut from his atlas by scripts/build_forge_icons.py); armour gets its heraldic glyph. */
const ItemIcon: React.FC<{ item: EquipmentItem; className?: string }> = ({ item, className }) =>
  item.slot === 'weapon' ? (
    <img src={`${ASSET_ROOT}/forge/${item.attachmentId}.png`} alt="" draggable={false} className={`pixelated object-contain ${className ?? ''}`} />
  ) : (
    <span className={`kk-forge__glyph ${className ?? ''}`} style={{ color: item.colorHex }}>{SLOT_GLYPH[item.slot] ?? '✦'}</span>
  );

interface BlacksmithShopProps {
  selectedIndex: number;
  onSelectItem: (item: EquipmentItem) => void;
  onHoverItem: (item: EquipmentItem) => void;
  onBack: () => void;
  playerGold: number;
  equippedIds: Set<string>;
  ownedIds: Set<string>;
  knightLevel: number;
  /** Cards cast per weapon: weapon levels. */
  weaponCasts: Record<string, number>;
  /** For binding each weapon's spells and Attack to this knight. */
  profile: PlayerProfile | null;
}

type Status =
  | { kind: 'sealed'; text: string; accent: string }
  | { kind: 'equipped' }
  | { kind: 'locked'; level: number }
  | { kind: 'owned' }
  | { kind: 'price'; price: number; afford: boolean };

export const BlacksmithShop: React.FC<BlacksmithShopProps> = ({
  selectedIndex,
  onSelectItem,
  onHoverItem,
  onBack,
  playerGold,
  equippedIds,
  ownedIds,
  knightLevel,
  weaponCasts,
  profile,
}) => {
  const zoom = useDesignZoom();
  const { rack, row } = locate(selectedIndex);
  const item = SHOP_ITEMS[selectedIndex] ?? SHOP_ITEMS[0];

  const statusOf = (it: EquipmentItem): Status => {
    const owned = ownedIds.has(it.id);
    if (it.stoneBound && !owned) return { kind: 'sealed', text: sealedCopy(it.id).sealed, accent: sealedCopy(it.id).accent };
    if (equippedIds.has(it.id)) return { kind: 'equipped' };
    const req = it.slot === 'weapon' && !it.stoneBound ? weaponLevelReq(it.level) : 1;
    if (knightLevel < req) return { kind: 'locked', level: req };
    if (owned) return { kind: 'owned' };
    return { kind: 'price', price: it.price, afford: playerGold >= it.price };
  };

  // The equipped weapon, to compare the inspected one against
  const equippedWeapon = SHOP_ITEMS.find((si) => si.slot === 'weapon' && equippedIds.has(si.id));
  const currentAttack = useMemo(() => loadoutFor(profile, equippedWeapon?.id).attack, [profile, equippedWeapon?.id]);

  const isWeapon = item.slot === 'weapon';
  const wLevel = weaponLevel(weaponCasts[item.id]);
  const w = isWeapon ? weaponStats(item.id, wLevel, undefined, knightLevel) : null;
  const attack = isWeapon ? loadoutFor(profile, item.id).attack : currentAttack;
  const spells: CardTemplate[] = useMemo(
    () => spellsForWeapon(isWeapon ? item.id : undefined).map((s) => bindCard(s, loadoutFor(profile, item.id))),
    [item.id, isWeapon, profile],
  );
  const status = statusOf(item);
  const rarity = RARITY[item.rarity];
  const accent = w?.element ? ELEMENT_INFO[w.element].color : item.colorHex;
  const cardScale = spells.length >= 3 ? 0.43 : spells.length === 2 ? 0.55 : 0.6;
  // How mastery works: at SPELL_MASTERY_LEVEL the weapon's spells join the deck whatever is wielded
  const mastered = wLevel >= SPELL_MASTERY_LEVEL;
  const masteryNote = (
    <div key={`mastery-${item.id}`} className={`kk-forge-mastery ${mastered ? 'kk-forge-mastery--done' : ''}`} style={{ zoom }}>
      <b>✦ Spell Mastery</b>
      {mastered ? (
        <span>Mastered! {spells.length > 1 ? 'These spells are' : 'This spell is'} thine forever, cast with any weapon thou wieldest.</span>
      ) : (
        <span>
          Raise this weapon to Lv {SPELL_MASTERY_LEVEL} and {spells.length > 1 ? 'its spells become' : 'its spell becomes'} thine forever, cast with any weapon.
          <em> Lv {wLevel}/{SPELL_MASTERY_LEVEL}</em>
        </span>
      )}
    </div>
  );
  const designW = window.innerWidth / zoom;

  return (
    <>
      {/* Under the dais: what the knight is trying on */}
      <div className="kk-forge-plaque-wrap">
        <div key={item.id} className="kk-forge-plaque" style={{ zoom }}>
          <span>{status.kind === 'equipped' ? 'Wielding' : 'Trying on'}</span>
          <b style={{ color: rarity.color }}>{item.name}</b>
        </div>
        {spells.length > 0 && masteryNote}
      </div>

      <section
        className="kk-forge"
        style={{ zoom, width: Math.round(designW * 0.56), '--accent': accent, '--rarity': rarity.color } as React.CSSProperties}
        aria-label="Blacksmith's forge"
      >
        <div className="kk-forge__embers" aria-hidden />

        {/* Header */}
        <header className="kk-forge__head">
          <div>
            <div className="kk-forge__over">⚒ Master Smith Brannoc ⚒</div>
            <h2 className="kk-forge__title">The Ember Forge</h2>
            <p className="kk-forge__sub">Steel tempered in dragonfire. Spells bound in the quench.</p>
          </div>
          <div className="kk-forge__purse" title="Thy purse">
            <span className="kk-forge__coin" />
            <b>{playerGold.toLocaleString()}</b>
            <small>GP</small>
          </div>
        </header>

        {/* Racks */}
        <nav className="kk-forge__tabs">
          <span className="kk-forge__key">◀</span>
          {RACKS.map((r, i) => (
            <button
              key={r.id}
              className={`kk-forge__tab ${i === rack ? 'kk-forge__tab--on' : ''}`}
              onClick={() => onHoverItem(SHOP_ITEMS[RACK_ITEMS[i][0]])}
            >
              <i>{r.glyph}</i>
              {r.label}
              <small>{RACK_ITEMS[i].length}</small>
            </button>
          ))}
          <span className="kk-forge__key">▶</span>
        </nav>

        <div className="kk-forge__body">
          {/* The rack */}
          <ul className="kk-forge__list">
            {RACK_ITEMS[rack].map((index, r) => {
              const it = SHOP_ITEMS[index];
              const st = statusOf(it);
              const itSpells = spellsForWeapon(it.slot === 'weapon' ? it.id : undefined);
              return (
                <li
                  key={it.id}
                  ref={(el) => {
                    if (r === row) el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  }}
                  onClick={() => (r === row ? onSelectItem(it) : onHoverItem(it))}
                  className={`kk-forge__row ${r === row ? 'kk-forge__row--on' : ''} ${st.kind === 'sealed' || st.kind === 'locked' ? 'kk-forge__row--dim' : ''}`}
                  style={{ '--rarity': RARITY[it.rarity].color } as React.CSSProperties}
                >
                  <div className="kk-forge__well">
                    <ItemIcon item={it} />
                  </div>
                  <div className="kk-forge__rowmain">
                    <div className="kk-forge__rowname">{it.name}</div>
                    <div className="kk-forge__rowsub">
                      <div className="kk-forge__rowspells">
                        {itSpells.length > 0
                          ? itSpells.map((s) => (
                              <span key={s.templateId}>
                                {s.icon} {s.name}
                              </span>
                            ))
                          : <span className="kk-forge__muted">+{it.powerBonus} power · ×{it.formMultiplier} form</span>}
                      </div>
                      <div className="kk-forge__rowtag">
                        {st.kind === 'sealed' && <span style={{ color: st.accent }}>Sealed</span>}
                        {st.kind === 'equipped' && <span className="kk-forge__equipped">✦ Wielded</span>}
                        {st.kind === 'locked' && <span className="kk-forge__locked">Lv {st.level}</span>}
                        {st.kind === 'owned' && <span className="kk-forge__owned">Owned</span>}
                        {st.kind === 'price' && (
                          <span className={st.afford ? 'kk-forge__price' : 'kk-forge__price kk-forge__price--short'}>
                            {st.price > 0 ? <>{st.price}<small> GP</small></> : 'Free'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Inspection */}
          <article key={item.id} className="kk-forge__detail">
            <div className="kk-forge__hero">
              <div className="kk-forge__altar">
                <ItemIcon item={item} className="kk-forge__heroicon" />
              </div>
              <div className="kk-forge__heroText">
                <div className="kk-forge__rarity">
                  {rarity.label} {isWeapon ? TYPE_LABEL[item.weaponType ?? 'bell'] : item.slot}
                  {w && <span className="kk-forge__tierpip">T{w.tier}</span>}
                </div>
                <h3 className="kk-forge__name">{item.name}</h3>
                <p className="kk-forge__lore">“{item.description}”</p>
              </div>
            </div>

            <div className="kk-forge__stats">
              {w ? (
                <>
                  <div className="kk-forge__stat">
                    <small>Attack</small>
                    <b className="text-[#FF5C7A]">+{w.atk}</b>
                    <em className={attack > currentAttack ? 'kk-up' : attack < currentAttack ? 'kk-down' : ''}>
                      {attack === currentAttack ? `= ${attack} total` : `${currentAttack} → ${attack} ${attack > currentAttack ? '▲' : '▼'}`}
                    </em>
                  </div>
                  <div className="kk-forge__stat">
                    <small>Element</small>
                    {w.element ? (
                      <>
                        <b style={{ color: ELEMENT_INFO[w.element].color }}>{ELEMENT_INFO[w.element].icon} +{w.elemDmg}</b>
                        <em>{ELEMENT_INFO[w.element].label.toLowerCase()} each hit</em>
                      </>
                    ) : (
                      <>
                        <b className="text-[#B8B2A7]">Steel</b>
                        <em>no element</em>
                      </>
                    )}
                  </div>
                  <div className="kk-forge__stat">
                    <small>Mastery</small>
                    <b className="text-[#F4B41A]">Lv {wLevel}</b>
                    {wLevel < WEAPON_MAX_LEVEL ? (
                      <span className="kk-forge__bar">
                        <i style={{ transform: `scaleX(${levelProgress(weaponCasts[item.id] ?? 0, castsForWeaponLevel, WEAPON_MAX_LEVEL)})` }} />
                      </span>
                    ) : (
                      <em>mastered</em>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="kk-forge__stat"><small>Power</small><b className="text-[#00EB88]">+{item.powerBonus}</b><em>each rep</em></div>
                  <div className="kk-forge__stat"><small>Form</small><b className="text-[#38B6FF]">×{item.formMultiplier}</b><em>form bonus</em></div>
                </>
              )}
            </div>

            <div className="kk-forge__rule">
              <span>
                {spells.length ? `Bound Spell${spells.length > 1 ? 's' : ''}` : 'Enchantment'}
                {spells.length > 0 && wLevel >= SPELL_MASTERY_LEVEL && ' · ✦ Mastered'}
              </span>
            </div>

            {spells.length > 0 && (
              <div className={`kk-forge__spells kk-forge__spells--${spells.length}`}>
                {spells.map((s) => (
                  <div key={s.templateId} className="kk-forge__spell">
                    <div className="kk-forge__cardbox" style={{ width: 228 * cardScale, height: 342 * cardScale }}>
                      <div className="kk-forge__card" style={{ ...cardStyleVars(s), transform: `scale(${cardScale})` }}>
                        <CardFront card={s} />
                      </div>
                    </div>
                    {spells.length === 1 && (
                      <div className="kk-forge__spelltext">
                        <h4 style={{ color: s.colorHex }}>{s.icon} {s.name}</h4>
                        <div className="kk-forge__spellmeta">
                          {s.requiredReps} × {s.exerciseLabel} · {TARGET_LABEL[s.target]}{s.target === 'CHAIN' ? ` ×${s.hits}` : ''}
                        </div>
                        <p>{s.effectDesc}</p>
                        <div className="kk-forge__muted">Two copies shuffle into thy deck while this weapon is wielded.</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {spells.length === 0 && (
              <p className="kk-forge__lore kk-forge__lore--plain">Worn, not wielded: it grants no spell, but steadies every rep.</p>
            )}
          </article>
        </div>

        {/* Verdict */}
        <footer className="kk-forge__foot">
          <button className={`kk-forge__act kk-forge__act--${status.kind === 'price' && !status.afford ? 'short' : status.kind}`} onClick={() => onSelectItem(item)}>
            {status.kind === 'sealed' && <span style={{ color: status.accent }}>{status.text}</span>}
            {status.kind === 'equipped' && <span>✦ Wielded by thy knight</span>}
            {status.kind === 'locked' && <span>🔒 Requires knight level {status.level}</span>}
            {status.kind === 'owned' && <span><kbd>Enter</kbd> Equip</span>}
            {status.kind === 'price' && (status.afford
              ? <span><kbd>Enter</kbd> Forge for {status.price > 0 ? `${status.price} GP` : 'free'}</span>
              : <span>Need {status.price - playerGold} more GP</span>)}
          </button>
          <div className="kk-forge__hints">
            <span><kbd className="kk-forge__arrows">▲▼</kbd> Browse</span>
            <span><kbd className="kk-forge__arrows">◀▶</kbd> Rack</span>
            <button onClick={onBack}><kbd>Back</kbd> Town</button>
          </div>
        </footer>
      </section>
    </>
  );
};

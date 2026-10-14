import { ALL_WEAPON_SPELLS } from '../../src/types/weaponSpells';
import { CARD_CATALOG } from '../../src/types/battle';
const row = (c: any) => `${c.templateId.padEnd(26)} ${c.rarity.padEnd(9)} ${c.target.padEnd(6)} ${c.exercise.padEnd(15)} reps ${c.requiredReps}  dmg ${String(c.damage).padStart(3)}${c.hits ? 'x' + c.hits : '  '} blk ${String(c.block).padStart(3)} heal ${String(c.heal).padStart(3)}`;
console.log('--- base cards'); CARD_CATALOG.filter((c) => c.rarity !== 'common').slice(0, 8).forEach((c) => console.log(row(c)));
console.log('--- spells'); ALL_WEAPON_SPELLS.forEach((c) => console.log(row(c)));

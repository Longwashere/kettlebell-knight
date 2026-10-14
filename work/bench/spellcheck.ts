import { ALL_WEAPON_SPELLS } from '../../src/types/weaponSpells';
import { SPELL_MOVES } from '../../src/tv/engine/spellMoves';
const ids = ALL_WEAPON_SPELLS.map((c) => c.templateId);
console.log('cards', ids.length, 'moves', Object.keys(SPELL_MOVES).length);
console.log('missing moves', ids.filter((i) => !SPELL_MOVES[i]));
console.log('orphan moves', Object.keys(SPELL_MOVES).filter((i) => !ids.includes(i)));

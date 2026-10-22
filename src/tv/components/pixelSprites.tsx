import React from 'react';

/**
 * Pixel-art sprites as character grids, drawn as crisp SVG rects (one per horizontal run).
 * 'x' takes the parent's colour via currentColor; '.' is transparent.
 */
const PIXEL_PALETTE: Record<string, string> = {
  k: '#0B0A10', w: '#F4F1E8', s: '#B8BCCB', d: '#6B6F84', g: '#C98A12', y: '#F4D35E',
  r: '#C8283F', R: '#7A1428', G: '#9FD8FF', q: '#2A4A66', b: '#38B6FF', B: '#1F6FB8',
  c: '#D6F3FF', n: '#A0703C', N: '#6B4626', a: '#5C5870', A: '#34313F', l: '#7B778C',
  o: '#E8DFC8', f: '#FF8A1E', F: '#B8360F',
  x: 'currentColor',
};

export const PixelSprite: React.FC<{ grid: string[]; px: number; className?: string; style?: React.CSSProperties }> = ({
  grid, px, className, style,
}) => {
  const w = grid[0].length;
  const h = grid.length;
  const rects: React.ReactNode[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const c = row[x];
      let run = 1;
      while (x + run < w && row[x + run] === c) run++;
      if (c !== '.') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={PIXEL_PALETTE[c]} />);
      x += run;
    }
  });
  return (
    <svg
      className={className}
      style={style}
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects}
    </svg>
  );
};

// ── Hub locations (20×20) ────────────────────────────────────────────────

/** Wall torch: Quick Play, "continue the march". */
export const ICON_TORCH = [
  '..........F.........',
  '.........FF.........',
  '.........FfF........',
  '........FffF........',
  '.......FfyfF.F......',
  '.......FfyyfFF......',
  '......FfyywyfF......',
  '......FfywwyfF......',
  '......FfyywyfF......',
  '.......FfyyfF.......',
  '........kkkk........',
  '.......knNNnk.......',
  '.......kNnnNk.......',
  '........knNk........',
  '........knNk........',
  '.....kkkkkkkkkk.....',
  '.....kdssssssdk.....',
  '.....kkkknNkkkk.....',
  '........knNk........',
  '.........kk.........',
];

/** Stone arch with a lowered portcullis: Guild Gate. */
export const ICON_GATE = [
  '......kkkkkkkk......',
  '....kkllllllllkk....',
  '...kllaaayyaaallk...',
  '..klaaAAAAAAAAaalk..',
  '.klaAAkkkkkkkkAAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAddddddddddAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAddddddddddAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAkdkkdkkdkkAalk.',
  '.klaAsdssdssdssAalk.',
  '.klaAkkkkkkkkkkAalk.',
  '.klaAkkkkkkkkkkAalk.',
  '.kaaaaaaaaaaaaaaaak.',
  'kAAAAAAAAAAAAAAAAAAk',
];

/** Anvil under a resting hammer: Blacksmith. */
export const ICON_ANVIL = [
  '....................',
  '.............kkkk...',
  '............kssswk..',
  '...........kssssdk..',
  '...........kkdsdkk..',
  '..........knkkkk..y.',
  '.........knk...y....',
  '........knk......y..',
  '.......knk..........',
  'kkkkkkkkkkkkkkkkkk..',
  'kwssssssssssssssk...',
  '.kkdsssssssssssdk...',
  '...kkkdssssssdkk....',
  '......kdsssdk.......',
  '......kdsssdk.......',
  '.....kddsssddk......',
  '....kdssssssssdk....',
  '...kddddddddddddk...',
  '...kkkkkkkkkkkkkk...',
  '....................',
];

/** Clasped grimoire: Sanctuary (codex of cards). */
export const ICON_TOME = [
  '....................',
  '...kkkkkkkkkkkkkk...',
  '..kRrrrrrrrrrrrrgk..',
  '..kRrgggggggggrrgk..',
  '..kRrgrrrrrrrgrrgk..',
  '..kRrgrrryrrrgrryk..',
  '..kRrgrryyyrrgryyk..',
  '..kRrgryyGyyrgryyk..',
  '..kRrgrryyyrrgryyk..',
  '..kRrgrrryrrrgrryk..',
  '..kRrgrrrrrrrgrrgk..',
  '..kRrgggggggggrrgk..',
  '..kRrrrrrrrrrrrrgk..',
  '..kRkkkkkkkkkkkkkk..',
  '..kRwwwwwwwwwwwwwk..',
  '..kRoooooooooooook..',
  '...kkkkkkkkkkkkkkk..',
  '....................',
];

// ── HUD (12×12, the helm 16×16) ──────────────────────────────────────────

/** The knight's helm for the nameplate portrait. */
export const ICON_HELM = [
  '.......rr.......',
  '......rrRr......',
  '.....kkkkkk.....',
  '....kssswssk....',
  '...kssswwsssk...',
  '...ksswwssssk...',
  '..ksssssssssdk..',
  '..kkkkkkkkkkkk..',
  '..kssdkkkkdsdk..',
  '..ksssssssssdk..',
  '..ksskskskssdk..',
  '..kssssssssddk..',
  '...kdssssssdk...',
  '..kgkddddddkgk..',
  '.kggggggggggggk.',
  'kgyyyyyyyyyyyygk',
];

/** Phone; the screen takes currentColor (lit when bound). */
export const ICON_PHONE = [
  '...kkkkkk...',
  '...kddddk...',
  '...kxxxxk...',
  '...kxwxxk...',
  '...kxxxxk...',
  '...kxxxxk...',
  '...kxxxxk...',
  '...kxxxxk...',
  '...kddddk...',
  '...kdssdk...',
  '...kkkkkk...',
  '............',
];

/** Lantern for the graphics setting; the flame takes currentColor. */
export const ICON_LANTERN = [
  '.....kk.....',
  '....k..k....',
  '...kkkkkk...',
  '..kggggggk..',
  '..kgxxxxgk..',
  '..kgxwwxgk..',
  '..kgxwwxgk..',
  '..kgxxxxgk..',
  '..kggggggk..',
  '...kkkkkk...',
  '....kggk....',
  '............',
];

/** Wooden door: save & return to the title. */
export const ICON_DOOR = [
  '...kkkkkk...',
  '..kNnnnnNk..',
  '..kNnNnnNk..',
  '..kNnNnnNk..',
  '..kNnNnnNk..',
  '..kNnNnyNk..',
  '..kNnNnnNk..',
  '..kNnNnnNk..',
  '..kNnNnnNk..',
  '..kNnnnnNk..',
  '.kkkkkkkkkk.',
  '............',
];

export const ICON_BELL = [
  '.....kk.....',
  '....kyyk....',
  '...kyyygk...',
  '..kyywyygk..',
  '..kyywyygk..',
  '..kyyyyygk..',
  '..kyyyyygk..',
  '.kyyyyyyggk.',
  'kkkkkkkkkkkk',
  '.....kk.....',
  '....kyk.....',
  '.....k......',
];

/** The bell in cold iron, struck through in red. */
export const ICON_BELL_MUTED = ICON_BELL.map((row, y) =>
  [...row.replace(/y/g, 'd').replace(/w/g, 's').replace(/g/g, 'a')]
    .map((c, x) => (x === 11 - y || x === 10 - y ? 'r' : c))
    .join(''),
);

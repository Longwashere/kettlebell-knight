import React from 'react';
import { HubLocation } from '../../types/game';
import { BattleMapId } from '../../types/battle';
import { CAMPAIGN_MAPS, CAMPAIGN_MAP_ORDER, latestUnlockedStage } from '../../shared/expeditionEngine';
import { profileManager } from '../../shared/ProfileManager';

/**
 * Pixel-art sprites as character grids, drawn as crisp SVG rects (one per horizontal run).
 * 'x' takes the plaque's accent via currentColor; '.' is transparent.
 */
const PIXEL_PALETTE: Record<string, string> = {
  k: '#0B0A10', w: '#F4F1E8', s: '#B8BCCB', d: '#6B6F84', g: '#C98A12', y: '#F4D35E',
  r: '#C8283F', R: '#7A1428', G: '#9FD8FF', q: '#2A4A66', b: '#38B6FF', B: '#1F6FB8',
  c: '#D6F3FF', n: '#A0703C', N: '#6B4626', m: '#2FAE6E', M: '#1D7046', e: '#9BF7C8',
  E: '#0C3A26', h: '#00EB88', a: '#5C5870', A: '#34313F', l: '#7B778C', o: '#E8DFC8',
  x: 'currentColor',
};

const PixelSprite: React.FC<{ grid: string[]; px: number; className?: string; style?: React.CSSProperties }> = ({
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

const ICON_SWORDS = [
  '....................',
  '..kk............kk..',
  '.kwsk..........kswk.',
  '.kdwsk........kswdk.',
  '..kdwsk......kswdk..',
  '...kdwsk....kswdk...',
  '....kdwsk..kswdk....',
  '.....kdwskkswdk.....',
  '......kdwsswdk......',
  '.......kdswdk.......',
  '...kk..kswdsk..kk...',
  '...kgkkswddwskkgk...',
  '....kygkdkkdkgyk....',
  '....kRrygkkgyrRk....',
  '...kRrkkyggykkrRk...',
  '..kRrk..kyyk..krRk..',
  '..kgk....kk....kgk..',
  '.kyyk..........kyyk.',
  '..kk............kk..',
  '....................',
];

const ICON_SHIELD = [
  '....................',
  '..kkkkkkkkkkkkkkkk..',
  '.kggggggggggggggggk.',
  '.kgssssssyyddddddgk.',
  '.kgswwsssyyddddddgk.',
  '.kgswssssyyddddddgk.',
  '.kgssssssyyddddddgk.',
  '.kgsyyyyyyyyyyyydgk.',
  '.kgsyyyyyyyyyyyydgk.',
  '.kgssssssyyddddddgk.',
  '.kgssssssyyddddddgk.',
  '..kgsssssyydddddgk..',
  '..kgsssssyydddddgk..',
  '...kgssssyyddddgk...',
  '...kgssssyyddddgk...',
  '....kgsssyydddgk....',
  '.....kgssyyddgk.....',
  '......kggyyggk......',
  '.......kkggkk.......',
  '.........kk.........',
];

const ICON_BOLT = [
  '....................',
  '..........kkkkk.....',
  '.........kyyyyk.....',
  '........kyyyyk......',
  '.......kyyyyk.......',
  '......kyyyyk........',
  '.....kyyyyk.........',
  '....kyyyyykkkkk.....',
  '...kwyyyyyyyyyk.....',
  '...kkkkkyyyyyk......',
  '.......kyyyyk.......',
  '......kyyyyk........',
  '.....kyyyyk.........',
  '....kyyygk..........',
  '...kyygk............',
  '...kygk.............',
  '..kygk..............',
  '..kgk...............',
  '..kk................',
  '....................',
];

const ICON_GATE = [
  '.........khk........',
  '.......kkhhhk.......',
  '......kmmmhMMk......',
  '.....kmmmmMMMMk.....',
  '....kmmmmmMMMMMk....',
  '...kmmmEeEeEeMMMk...',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeeeeeeeeMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeeeeeeeeMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '..kmmmeEeEeEeEMMMk..',
  '.kMMMMMMMMMMMMMMMMk.',
  '..kkkkkkkkkkkkkkkk..',
];

const ICON_DOOR = [
  '....................',
  '.......kkkkkk.......',
  '.....kkaaaaaakk.....',
  '....kaalAlllAaak....',
  '...kaallAlllAlaak...',
  '...kalllAlllAllak...',
  '...kaAAAAAAAAAAak...',
  '...kalllAlllAllak...',
  '...kalllAlllAllak...',
  '...kalllAlllAllak...',
  '...kalllAlllAllak...',
  '...kalllAlllAylak...',
  '...kalllAlllAglak...',
  '...kaAAAAAAAAAAak...',
  '...kalllAlllAllak...',
  '...kalllAlllAllak...',
  '...kalllAlllAllak...',
  '...kaaaaaaaaaaaak...',
  '....kkkkkkkkkkkk....',
  '....................',
];

/** Horned skull crest that sits on each plaque's top edge. */
const CREST_SKULL = [
  '.....kkkkkkk.....',
  'k...koooooook...k',
  'xk.koooooooook.kx',
  '.xkkoooooooookkx.',
  '..xkokkkokkkokx..',
  '...kokkkokkkok...',
  '...kooookooook...',
  '....koooooook....',
  '....kokokokok....',
  '.....kkkkkkk.....',
];

/** Thorned bracket for the top-left corner; the other corners mirror it. */
const CORNER_THORN = [
  'kk..........',
  'kxk.........',
  '.kxkkkkkkkk.',
  '..kxxxxxxxxk',
  '..kxkkkkkkk.',
  '..kxk.kk....',
  '..kxkkxk....',
  '..kxk.k.....',
  '..kxk.......',
  '..kxk.......',
  '..kxk.......',
  '...k........',
];

export interface HubNodeInfo {
  id: HubLocation;
  title: string;
  subtitle: string;
  desc: string;
  icon: string[];
  accentColor: string;
}

export const HUB_NODES: HubNodeInfo[] = [
  {
    id: 'QUICK_PLAY',
    title: 'QUICK PLAY',
    subtitle: 'LATEST STAGE',
    desc: 'Fight thy latest unlocked stage.',
    icon: ICON_BOLT,
    accentColor: '#38B6FF',
  },
  {
    id: 'GATE',
    title: 'GUILD GATE',
    subtitle: 'DUNGEON QUESTS',
    desc: 'Battle dungeon monsters with kettlebell power.',
    icon: ICON_SWORDS,
    accentColor: '#FF3366',
  },
  {
    id: 'BLACKSMITH',
    title: 'BLACKSMITH',
    subtitle: 'EQUIPMENT FORGE',
    desc: 'Forge bells and armor for thy knight.',
    icon: ICON_SHIELD,
    accentColor: '#F4B41A',
  },
  {
    id: 'SANCTUARY',
    title: 'SANCTUARY',
    subtitle: 'CODEX & GRIMOIRE',
    desc: 'Browse thy combat cards and monster drops.',
    icon: ICON_GATE,
    accentColor: '#00EB88',
  },
  {
    id: 'TITLE',
    title: 'TITLE SCREEN',
    subtitle: 'SAVE & QUIT',
    desc: 'Record thy deeds and return to the gates.',
    icon: ICON_DOOR,
    accentColor: '#A7A9BE',
  },
];

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;

interface HubMenuProps {
  selectedIndex: number;
  onSelectNode: (node: HubLocation) => void;
  onHoverNode: (index: number) => void;
  isFocused?: boolean;
  quickPlayStage?: { mapId: BattleMapId; level: number };
}

export const HubMenu: React.FC<HubMenuProps> = ({
  selectedIndex,
  onSelectNode,
  onHoverNode,
  isFocused = true,
  quickPlayStage,
}) => {
  const stage = quickPlayStage ?? latestUnlockedStage(profileManager.getActiveProfile());
  const stageIndex = CAMPAIGN_MAP_ORDER.indexOf(stage.mapId) + 1;
  const stageNum = stageIndex > 0 ? stageIndex : 1;
  const mapConfig = CAMPAIGN_MAPS[stage.mapId];
  const mapName = mapConfig?.name ?? stage.mapId.replace(/_/g, ' ');
  const lvlConfig = mapConfig?.levels?.find((l) => l.level === stage.level);
  const isBoss = stage.level === 5;

  return (
    <div className="kk-hub">
      {/* Town title banner */}
      <div className="kk-hub__banner">
        <span className="kk-hub__banner-plate">
          <span className="kk-hub__gem" />
          CITADEL OF THE BELL
          <span className="kk-hub__banner-sep">✦</span>
          HUB TOWN
          <span className="kk-hub__gem" />
        </span>
      </div>

      {/* 5 hub plaques (Fire TV 10-foot navigation) */}
      <div className="kk-hub__row">
        {HUB_NODES.map((node, index) => {
          const isSelected = isFocused && selectedIndex === index;
          const isQuickPlay = node.id === 'QUICK_PLAY';
          const subtitle = isQuickPlay
            ? `STAGE ${stageNum} • LVL ${stage.level}${isBoss ? ' (BOSS)' : ''}`
            : node.subtitle;

          const descContent = isQuickPlay ? (
            <>
              <span className="text-[#FFFFFE] font-bold block truncate">{mapName}</span>
              <span className="text-[#C9C4D6] block text-[17px] leading-tight mt-0.5">
                Level {stage.level} of 5: {lvlConfig?.title ?? 'Expedition'}
              </span>
            </>
          ) : (
            node.desc
          );

          return (
            <div
              key={node.id}
              role="button"
              onClick={() => onSelectNode(node.id)}
              onMouseEnter={() => onHoverNode(index)}
              className={`kk-plaque ${isSelected ? 'kk-plaque--focused' : ''}`}
              style={isSelected ? undefined : ({ '--accent': node.accentColor, '--accent-line': `${node.accentColor}73`, '--accent-dim': `${node.accentColor}B3` } as React.CSSProperties)}
            >
              {CORNERS.map((c) => (
                <PixelSprite key={c} grid={CORNER_THORN} px={3} className={`kk-plaque__corner kk-plaque__corner--${c}`} />
              ))}
              <PixelSprite grid={CREST_SKULL} px={3} className="kk-plaque__crest" />

              <div className="kk-plaque__icon">
                {isSelected && <span className="kk-plaque__chevron kk-plaque__chevron--l" />}
                <PixelSprite grid={node.icon} px={3} className="kk-plaque__sprite" />
                {isSelected && <span className="kk-plaque__chevron kk-plaque__chevron--r" />}
              </div>

              <h3 className="kk-plaque__title">{node.title}</h3>
              <span className="kk-plaque__subtitle">{subtitle}</span>
              <div className="kk-plaque__desc">{descContent}</div>
              <span className="kk-plaque__prompt">{isSelected ? '▶ PRESS SELECT' : ''}</span>

              <span className="kk-plaque__medal">
                <PixelSprite grid={node.icon} px={1} />
              </span>

              {isSelected && (
                <span className="kk-plaque__embers" aria-hidden>
                  <i /><i /><i /><i /><i />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

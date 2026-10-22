import React from 'react';
import { HubLocation } from '../../types/game';
import { BattleMapId } from '../../types/battle';
import { CAMPAIGN_MAPS, CAMPAIGN_MAP_ORDER, latestUnlockedStage } from '../../shared/expeditionEngine';
import { profileManager } from '../../shared/ProfileManager';
import { PixelSprite, ICON_ANVIL, ICON_GATE, ICON_LANTERN, ICON_TOME, ICON_TORCH } from './pixelSprites';
import { GRAPHICS_MODE_LABEL, type GraphicsMode } from '../graphicsMode';

export interface HubNodeInfo {
  id: HubLocation;
  title: string;
  desc: string;
  icon: string[];
}

/** The town's places, left to right, then the graphics setting. Leaving and sound live in the top bar. */
export const HUB_NODES: HubNodeInfo[] = [
  { id: 'QUICK_PLAY', title: 'Continue', desc: '', icon: ICON_TORCH },
  { id: 'GATE', title: 'Guild Gate', desc: 'Choose thy road into the dungeons.', icon: ICON_GATE },
  { id: 'BLACKSMITH', title: 'The Forge', desc: 'Bells, maces and blades, for a price.', icon: ICON_ANVIL },
  { id: 'SANCTUARY', title: 'Sanctuary', desc: 'Thy deck, thy spells, thy trophies.', icon: ICON_TOME },
  { id: 'GRAPHICS', title: 'Visuals', desc: '', icon: ICON_LANTERN },
];

/** The Visuals lantern burns brighter with the setting: dim at Performance, lit at Quality, white-hot at Ultra. */
const LANTERN_COLOR: Record<GraphicsMode, string> = { PERFORMANCE: '#8C6A2A', QUALITY: '#F4D35E', ULTRA: '#FFF4C2' };

interface HubMenuProps {
  selectedIndex: number;
  onSelectNode: (node: HubLocation) => void;
  onHoverNode: (index: number) => void;
  isFocused?: boolean;
  quickPlayStage?: { mapId: BattleMapId; level: number };
  graphicsMode: GraphicsMode;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  selectedIndex,
  onSelectNode,
  onHoverNode,
  isFocused = true,
  quickPlayStage,
  graphicsMode,
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
      <div className="kk-hub__head">
        <span className="kk-hub__over">Hub Town</span>
        <h1 className="kk-hub__title">Citadel of the Bell</h1>
      </div>

      <div className="kk-hub__row">
        {HUB_NODES.map((node, index) => {
          const isSelected = isFocused && selectedIndex === index;
          const isQuickPlay = node.id === 'QUICK_PLAY';
          const isGraphics = node.id === 'GRAPHICS';

          return (
            <div
              key={node.id}
              role="button"
              onClick={() => onSelectNode(node.id)}
              onMouseEnter={() => onHoverNode(index)}
              className={`kk-plaque ${isQuickPlay ? 'kk-plaque--march' : ''} ${isSelected ? 'kk-plaque--focused' : ''}`}
              style={isGraphics ? { color: LANTERN_COLOR[graphicsMode] } : undefined}
            >
              <div className="kk-plaque__icon">
                <PixelSprite grid={node.icon} px={isQuickPlay ? 4 : isGraphics ? 5 : 3} className="kk-plaque__sprite" />
              </div>

              {isQuickPlay ? (
                <div className="kk-plaque__march">
                  <span className="kk-plaque__over">Continue the march</span>
                  <h3 className="kk-plaque__title">{mapName}</h3>
                  <p className="kk-plaque__desc">
                    {lvlConfig?.title ?? 'Expedition'}
                  </p>
                  <span className="kk-plaque__stage">
                    Map {stageNum} <i>·</i> Level {stage.level} of 5
                    {isBoss && <em> · Boss</em>}
                  </span>
                </div>
              ) : (
                <>
                  <h3 className="kk-plaque__title">{node.title}</h3>
                  {isGraphics ? (
                    <p className="kk-plaque__desc">
                      {GRAPHICS_MODE_LABEL[graphicsMode]}
                      <span className="kk-plaque__toggle">Select to switch</span>
                    </p>
                  ) : (
                    <p className="kk-plaque__desc">{node.desc}</p>
                  )}
                </>
              )}

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

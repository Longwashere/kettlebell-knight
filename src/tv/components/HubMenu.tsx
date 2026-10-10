import React from 'react';
import { HubLocation } from '../../types/game';
import { Shield, Sparkles, FlaskConical, Church, Swords } from 'lucide-react';

export interface HubNodeInfo {
  id: HubLocation;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ReactNode;
  accentColor: string;
}

export const HUB_NODES: HubNodeInfo[] = [
  {
    id: 'GATE',
    title: 'GUILD GATE',
    subtitle: 'DUNGEON QUESTS',
    desc: 'Battle dungeon monsters using explosive kettlebell swing power.',
    icon: <Swords className="w-8 h-8 text-[#FF3366]" />,
    accentColor: '#FF3366',
  },
  {
    id: 'BLACKSMITH',
    title: 'BLACKSMITH',
    subtitle: 'EQUIPMENT FORGE',
    desc: 'Forge bells and armor. Preview skeleton attachments in real-time.',
    icon: <Shield className="w-8 h-8 text-[#F4B41A]" />,
    accentColor: '#F4B41A',
  },
  {
    id: 'ALCHEMIST',
    title: 'ALCHEMIST',
    subtitle: 'POTIONS & BREWS',
    desc: 'Elixirs of endurance and pre-workout concoctions to boost rep form.',
    icon: <FlaskConical className="w-8 h-8 text-[#38B6FF]" />,
    accentColor: '#38B6FF',
  },
  {
    id: 'SANCTUARY',
    title: 'SANCTUARY',
    subtitle: 'HALL OF HEROES',
    desc: 'View workout kinematics telemetry logs and legendary achievements.',
    icon: <Church className="w-8 h-8 text-[#00EB88]" />,
    accentColor: '#00EB88',
  },
];

interface HubMenuProps {
  selectedIndex: number;
  onSelectNode: (node: HubLocation) => void;
  onHoverNode: (index: number) => void;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  selectedIndex,
  onSelectNode,
  onHoverNode,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Town Title banner */}
      <div className="text-center mb-6">
        <div className="inline-block bg-[#1A1926]/90 border-2 border-[#F4B41A] px-4 py-1.5 rounded shadow-pixel-box">
          <span className="font-pixel text-[11px] text-[#F4B41A] tracking-wider">
            🏰 CITADEL OF THE BELL • HUB TOWN
          </span>
        </div>
      </div>

      {/* 4 Hub Menu Nodes Grid (Fire TV 10-foot navigation) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {HUB_NODES.map((node, index) => {
          const isSelected = selectedIndex === index;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              onMouseEnter={() => onHoverNode(index)}
              className={`p-4 rounded border-4 transition-all duration-150 cursor-pointer flex flex-col justify-between h-48 bg-[#1A1926]/90 ${
                isSelected
                  ? 'tv-focused border-[#F4B41A] bg-[#242138] shadow-pixel-box-gold'
                  : 'border-[#2E2B44] hover:border-[#38B6FF] shadow-pixel-box'
              }`}
            >
              <div>
                <div className="mb-3 p-2 w-12 h-12 rounded bg-[#0F0E17] border-2 border-[#2E2B44] flex items-center justify-center shadow-pixel-box">
                  {node.icon}
                </div>
                <h3 className="font-pixel text-xs text-white leading-tight">
                  {node.title}
                </h3>
                <span
                  className="font-pixel text-[9px] block mt-1 uppercase"
                  style={{ color: node.accentColor }}
                >
                  {node.subtitle}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-mono text-[#A7A9BE] line-clamp-2">
                  {node.desc}
                </p>
                {isSelected && (
                  <div className="mt-2 text-[9px] font-pixel text-[#F4B41A] flex items-center gap-1 animate-pulse">
                    <span>▶ PRESS SELECT</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

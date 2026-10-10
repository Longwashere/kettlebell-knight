import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { GameScreen } from './tv/components/GameScreen';
import { PhoneView } from './phone/components/PhoneView';
import { Tv, Smartphone, Swords, Shield, Zap } from 'lucide-react';

const RootLauncher: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col items-center justify-center p-6 select-none crt-overlay font-sans">
      <div className="max-w-xl w-full text-center space-y-6">
        {/* Retro Game Title */}
        <div className="space-y-2">
          <div className="inline-block p-4 bg-[#F4B41A] text-[#0F0E17] rounded shadow-pixel-box mb-2">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-pixel text-[#F4B41A] tracking-wider leading-relaxed">
            KETTLEBELL KNIGHT
          </h1>
          <p className="font-pixel text-[10px] text-[#38B6FF] uppercase tracking-widest">
            32-Bit Retro Fitness RPG • Fire TV & Mobile Companion
          </p>
        </div>

        {/* Dual Mode Launcher Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* TV Screen Mode */}
          <Link
            to="/tv"
            className="p-6 bg-[#1A1926] border-4 border-[#F4B41A] hover:bg-[#242138] rounded shadow-pixel-box-gold transition-all transform hover:-translate-y-1 flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded bg-[#0F0E17] border-2 border-[#F4B41A] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Tv className="w-7 h-7 text-[#F4B41A]" />
            </div>
            <h2 className="font-pixel text-xs text-[#F4B41A]">LAUNCH FIRE TV (10-FOOT UI)</h2>
            <p className="text-[11px] font-mono text-[#A7A9BE] mt-2">
              426x240 PixiJS WebGL canvas, D-Pad Remote spatial navigation, Blacksmith equipment forge.
            </p>
            <span className="mt-4 text-[9px] font-pixel text-[#00EB88] bg-[#00EB88]/10 border border-[#00EB88] px-2 py-1">
              /tv ROUTE ▶
            </span>
          </Link>

          {/* Phone Vision Companion */}
          <Link
            to="/phone"
            className="p-6 bg-[#1A1926] border-4 border-[#38B6FF] hover:bg-[#242138] rounded shadow-pixel-box transition-all transform hover:-translate-y-1 flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded bg-[#0F0E17] border-2 border-[#38B6FF] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7 text-[#38B6FF]" />
            </div>
            <h2 className="font-pixel text-xs text-[#38B6FF]">LAUNCH PHONE COMPANION</h2>
            <p className="text-[11px] font-mono text-[#A7A9BE] mt-2">
              MediaPipe Pose Landmarker, Frontal Y-Axis Kinematics, WebRTC DataChannel live telemetry streaming.
            </p>
            <span className="mt-4 text-[9px] font-pixel text-[#38B6FF] bg-[#38B6FF]/10 border border-[#38B6FF] px-2 py-1">
              /phone ROUTE ▶
            </span>
          </Link>
        </div>

        {/* System Details Footer */}
        <div className="bg-[#1A1926]/60 border-2 border-[#2E2B44] p-3 rounded text-[10px] font-mono text-[#A7A9BE] space-y-1">
          <div>• Zero React Layout Thrashing: Isolated 60 FPS WebGL loop</div>
          <div>• Vega OS / Fire OS Keycode D-Pad Navigation (Enter, Arrows, Back, Media)</div>
          <div>• Y-Axis Delta Biomechanical State Machine (Hike ➔ Drive ➔ Lockout)</div>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLauncher />} />
        <Route path="/tv" element={<GameScreen />} />
        <Route path="/phone" element={<PhoneView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, CheckCircle, Wifi, Copy, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isPaired: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  roomId,
  isOpen,
  onClose,
  isPaired,
}) => {
  // Auto-close modal after successful connection so user doesn't need to press Back on TV remote
  useEffect(() => {
    if (isPaired && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isPaired, isOpen, onClose]);

  if (!isOpen) return null;

  const phoneUrl = `${window.location.origin}/phone?room=${roomId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1A1926] border-4 border-[#38B6FF] p-6 max-w-md w-full rounded shadow-pixel-box text-center relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#A7A9BE] hover:text-white bg-[#0F0E17] border-2 border-[#2E2B44] p-1 shadow-pixel-box"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Smartphone className="w-5 h-5 text-[#38B6FF]" />
          <h2 className="font-pixel text-xs text-[#38B6FF]">PAIR MOBILE COMPANION</h2>
        </div>

        <p className="text-xs text-[#A7A9BE] font-mono mb-4">
          Scan with your smartphone camera to stream MediaPipe Pose Landmarker telemetry directly to Fire TV.
        </p>

        {/* QR Code Canvas */}
        <div className="inline-block p-4 bg-white border-4 border-black rounded shadow-pixel-box mb-4">
          <QRCodeSVG
            value={phoneUrl}
            size={180}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Room Code Badge */}
        <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded mb-4">
          <span className="text-[10px] font-pixel text-[#A7A9BE] block">ROOM CODE</span>
          <span className="text-xl font-pixel text-[#F4B41A] tracking-widest">{roomId}</span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center justify-center space-x-2 text-xs font-mono mb-4">
          {isPaired ? (
            <span className="text-[#00EB88] flex items-center gap-1.5 font-pixel text-[10px]">
              <CheckCircle className="w-4 h-4 text-[#00EB88]" />
              MOBILE COMPANION CONNECTED!
            </span>
          ) : (
            <span className="text-[#F4B41A] flex items-center gap-1.5 font-pixel text-[10px] animate-pulse">
              <Wifi className="w-4 h-4 text-[#F4B41A]" />
              WAITING FOR PHONE WEBRTC CONNECTION...
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          <a
            href={phoneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#38B6FF] hover:bg-[#38B6FF]/80 text-[#0F0E17] font-pixel text-[10px] py-2.5 px-3 border-2 border-black shadow-pixel-box flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            OPEN PHONE TAB
          </a>
          <button
            onClick={onClose}
            className="bg-[#2E2B44] hover:bg-[#3E3B5E] text-white font-pixel text-[10px] py-2.5 px-4 border-2 border-black shadow-pixel-box"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          dark: '#0F0E17',
          gold: '#F4B41A',
          cyan: '#38B6FF',
          crimson: '#FF3366',
          panel: '#1A1926',
          panelBorder: '#2E2B44',
          highlight: '#FFFFFE',
          subtext: '#A7A9BE',
          success: '#00EB88',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"Courier New"', 'monospace'],
        display: ['"Silkscreen"', '"Press Start 2P"', 'monospace'],
        retro: ['"VT323"', 'monospace'],
        gothic: ['"Cinzel"', 'Georgia', 'serif'],
        tome: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'pixel-gold': '0 0 0 3px #0F0E17, 0 0 0 6px #F4B41A',
        'pixel-cyan': '0 0 0 3px #0F0E17, 0 0 0 6px #38B6FF',
        'pixel-crimson': '0 0 0 3px #0F0E17, 0 0 0 6px #FF3366',
        'pixel-box': '4px 4px 0px 0px #000000',
        'pixel-box-gold': '4px 4px 0px 0px #F4B41A',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'float-rep': 'floatRep 1.2s forwards ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        floatRep: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-60px) scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
}

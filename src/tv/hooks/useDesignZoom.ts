import { useEffect, useState } from 'react';

/** The design height TV screens are laid out at; they zoom to the real viewport so 720p and the TV's 1080p match. */
export const DESIGN_H = 720;

/** CSS zoom that scales a 720-high design to the window height, kept current on resize. */
export function useDesignZoom(): number {
  const [zoom, setZoom] = useState(() => window.innerHeight / DESIGN_H);
  useEffect(() => {
    const onResize = () => setZoom(window.innerHeight / DESIGN_H);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return zoom;
}

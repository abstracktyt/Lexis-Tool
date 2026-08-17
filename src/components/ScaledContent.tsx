import { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
  minScale?: number;
  maxScale?: number;
}

// Scales the whole window content (fonts included) to the window size,
// so text never overlaps when the overlay is resized.
export default function ScaledContent({ children, baseWidth, baseHeight, minScale = 0.55, maxScale = 1.15 }: Props) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth || window.outerWidth || baseWidth;
      const h = window.innerHeight || window.outerHeight || baseHeight;
      const s = Math.min(w / baseWidth, h / baseHeight);
      setScale(Math.max(minScale, Math.min(maxScale, s)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseWidth, baseHeight, minScale, maxScale]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}vw`, height: `${100 / scale}vh`, boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  );
}

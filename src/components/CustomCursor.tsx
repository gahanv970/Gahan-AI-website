import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [trailPos, setTrailPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPointer, setIsPointer] = useState(true);

  useEffect(() => {
    // Check if coarse pointer (touch device)
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsPointer(false);
      return;
    }

    let animationFrameId: number;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setPos({ x: targetX, y: targetY });

      // Check if hovering interactive element
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.closest('button') ||
          target.closest('a') ||
          target.dataset.cursorHover === 'true')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const animateTrail = () => {
      // Smooth exponential damping / lerp
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      setTrailPos({ x: currentX, y: currentY });
      animationFrameId = requestAnimationFrame(animateTrail);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameId = requestAnimationFrame(animateTrail);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!isPointer) return null;

  return (
    <>
      {/* High precision center dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-cyan-400 rounded-full pointer-events-none z-50 transition-transform duration-75 shadow-[0_0_10px_#38bdf8]"
        style={{
          transform: `translate3d(${pos.x - 4}px, ${pos.y - 4}px, 0) scale(${isHovered ? 1.8 : 1})`,
        }}
      />
      {/* Smooth trailing ring */}
      <div
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-50 transition-all duration-300 ${
          isHovered
            ? 'w-12 h-12 border border-cyan-400/80 bg-cyan-500/10 backdrop-blur-[1px] glow-cyan'
            : 'w-8 h-8 border border-white/20 bg-transparent'
        }`}
        style={{
          transform: `translate3d(${trailPos.x - (isHovered ? 24 : 16)}px, ${
            trailPos.y - (isHovered ? 24 : 16)
          }px, 0)`,
        }}
      />
    </>
  );
};

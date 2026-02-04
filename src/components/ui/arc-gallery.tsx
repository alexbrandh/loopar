'use client';

import React, { useEffect, useState } from 'react';

type ArcGalleryProps = {
  images: string[];
  className?: string;
};

export const ArcGallery: React.FC<ArcGalleryProps> = ({
  images,
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Posiciones predefinidas para las fotos - optimizadas para móvil
  const positions = [
    // Esquinas superiores - más pequeñas en móvil
    { left: '-2%', top: '8%', rotate: -15, size: 'w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28' },
    { right: '-2%', top: '8%', rotate: 15, size: 'w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28' },
    // Laterales medios
    { left: '-3%', top: '35%', rotate: -8, size: 'w-12 h-12 sm:w-18 sm:h-18 lg:w-24 lg:h-24' },
    { right: '-3%', top: '35%', rotate: 8, size: 'w-12 h-12 sm:w-18 sm:h-18 lg:w-24 lg:h-24' },
    // Parte inferior
    { left: '5%', top: '65%', rotate: -12, size: 'w-16 h-16 sm:w-20 sm:h-20 lg:w-26 lg:h-26' },
    { right: '5%', top: '65%', rotate: 12, size: 'w-16 h-16 sm:w-20 sm:h-20 lg:w-26 lg:h-26' },
    // Arriba centro - solo visible en pantallas grandes
    { left: '18%', top: '3%', rotate: -5, size: 'hidden sm:block sm:w-16 sm:h-16 lg:w-20 lg:h-20' },
    { right: '18%', top: '3%', rotate: 5, size: 'hidden sm:block sm:w-16 sm:h-16 lg:w-20 lg:h-20' },
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {images.slice(0, positions.length).map((src, i) => {
        const pos = positions[i];
        return (
          <div
            key={i}
            className={`absolute ${pos.size} animate-arc-fade-in`}
            style={{
              left: pos.left,
              right: pos.right,
              top: pos.top,
              animationDelay: `${i * 150}ms`,
              animationFillMode: 'forwards',
              opacity: 0,
            }}
          >
            <div 
              className="rounded-2xl shadow-xl overflow-hidden ring-1 ring-border/30 bg-card/50 backdrop-blur-sm w-full h-full"
              style={{ transform: `rotate(${pos.rotate}deg)` }}
            >
              <img
                src={src}
                alt={`Memoria ${i + 1}`}
                className="block w-full h-full object-cover opacity-90"
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/400x400/334155/e2e8f0?text=Foto`;
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes arc-fade-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-arc-fade-in {
          animation-name: arc-fade-in;
          animation-duration: 0.8s;
          animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default ArcGallery;

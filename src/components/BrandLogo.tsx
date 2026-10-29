import React from 'react';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-cover rounded-xl',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-amber-500/40 bg-stone-900 shadow-md shadow-amber-500/20 shrink-0 flex items-center justify-center ${className}`}
    >
      <img
        src="/api/images/pollobroaster.jpg"
        alt="Logo Terreno Broaster"
        loading="eager"
        className={imgClassName}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          // Fallback to terrenobroaster or broaster1 if pollobroaster not found
          target.src = '/api/images/broaster1.jpg';
        }}
      />
    </div>
  );
};
export default BrandLogo;

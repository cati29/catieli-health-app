import React from 'react';
import { Heart, Activity } from 'lucide-react';

export default function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Heart 
          size={sizes[size].icon} 
          className="text-emerald-500 fill-emerald-500"
        />
        <Activity 
          size={sizes[size].icon * 0.5} 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
          strokeWidth={3}
        />
      </div>
      {showText && (
        <span className={`font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent ${sizes[size].text}`}>
          HEALTH APP
        </span>
      )}
    </div>
  );
}
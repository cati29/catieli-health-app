import React from 'react';
import { motion } from 'framer-motion';

export default function AvatarEvolution({ level = 1, xp = 0, size = 'lg', showStats = true }) {
  // Avatar evolves based on level: 1-5 sedentary, 6-10 active, 11-20 fit, 21+ athletic
  const getAvatarStage = () => {
    if (level <= 5) return { stage: 1, name: 'Iniciante', color: 'from-gray-400 to-gray-500' };
    if (level <= 10) return { stage: 2, name: 'Ativo', color: 'from-emerald-400 to-emerald-500' };
    if (level <= 20) return { stage: 3, name: 'Fitness', color: 'from-blue-400 to-emerald-500' };
    return { stage: 4, name: 'Atleta', color: 'from-amber-400 to-emerald-500' };
  };

  const avatar = getAvatarStage();
  const xpForNextLevel = level * 100;
  const progress = Math.min((xp % (level * 100)) / xpForNextLevel * 100, 100);

  const sizes = {
    sm: { container: 'w-16 h-16', figure: 'w-10 h-10' },
    md: { container: 'w-24 h-24', figure: 'w-16 h-16' },
    lg: { container: 'w-32 h-32', figure: 'w-20 h-20' }
  };

  const getAvatarBody = () => {
    const stageStyles = {
      1: { body: 'rounded-full', muscles: false },
      2: { body: 'rounded-2xl', muscles: false },
      3: { body: 'rounded-xl', muscles: true },
      4: { body: 'rounded-lg', muscles: true }
    };
    return stageStyles[avatar.stage];
  };

  const bodyStyle = getAvatarBody();

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`relative ${sizes[size].container} bg-gradient-to-br ${avatar.color} rounded-full flex items-center justify-center shadow-lg`}
        animate={{ 
          scale: [1, 1.02, 1],
          boxShadow: [
            '0 0 20px rgba(16, 185, 129, 0.3)',
            '0 0 30px rgba(16, 185, 129, 0.5)',
            '0 0 20px rgba(16, 185, 129, 0.3)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Avatar Figure */}
        <div className={`${sizes[size].figure} relative`}>
          {/* Head */}
          <motion.div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-200 rounded-full border-2 border-amber-300"
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Body */}
          <div className={`absolute top-5 left-1/2 -translate-x-1/2 w-8 h-10 bg-white ${bodyStyle.body}`}>
            {bodyStyle.muscles && (
              <>
                <div className="absolute top-2 left-1 w-2 h-3 bg-gray-200 rounded" />
                <div className="absolute top-2 right-1 w-2 h-3 bg-gray-200 rounded" />
              </>
            )}
          </div>
          {/* Arms */}
          <motion.div 
            className="absolute top-6 -left-1 w-2 h-6 bg-amber-200 rounded-full origin-top"
            animate={{ rotate: avatar.stage >= 3 ? [-5, 5, -5] : 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-6 -right-1 w-2 h-6 bg-amber-200 rounded-full origin-top"
            animate={{ rotate: avatar.stage >= 3 ? [5, -5, 5] : 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          {/* Legs */}
          <motion.div 
            className="absolute bottom-0 left-2 w-2 h-5 bg-blue-400 rounded-b-full"
            animate={{ rotate: avatar.stage >= 2 ? [-3, 3, -3] : 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-0 right-2 w-2 h-5 bg-blue-400 rounded-b-full"
            animate={{ rotate: avatar.stage >= 2 ? [3, -3, 3] : 0 }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        
        {/* Level Badge */}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white">
          {level}
        </div>
      </motion.div>

      {showStats && (
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{avatar.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-gray-500">{xp} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

export default function BadgeCard({ badge, isUnlocked, progress = 0 }) {
  const rarityColors = {
    common: 'from-gray-400 to-gray-500',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-amber-400 to-amber-600'
  };

  const rarityBorder = {
    common: 'border-gray-300',
    rare: 'border-blue-400',
    epic: 'border-purple-400',
    legendary: 'border-amber-400'
  };

  const progressPercent = (progress / badge.requirement_value) * 100;

  return (
    <motion.div
      whileHover={{ y: isUnlocked ? -3 : -1, scale: isUnlocked ? 1.01 : 1 }}
      className={`relative rounded-2xl p-5 border transition-all ${
        isUnlocked
          ? `${rarityBorder[badge.rarity]} bg-white shadow-sm hover:shadow-md`
          : 'border-gray-200 bg-gray-50/60 opacity-80'
      }`}
    >
      <div className="relative mb-3">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl ${
          isUnlocked
            ? `bg-gradient-to-br ${rarityColors[badge.rarity]} shadow-md`
            : 'bg-gray-100'
        }`}
        >
          {isUnlocked ? (
            badge.icon || '🏆'
          ) : (
            <Lock className="text-gray-400" size={32} />
          )}
        </div>

        {isUnlocked && badge.rarity !== 'common' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="text-amber-400" size={20} />
          </motion.div>
        )}
      </div>

      <div className="text-center">
        <h3 className={`font-bold mb-1 ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {badge.description}
        </p>

        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
          badge.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700' :
            badge.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
              badge.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
        }`}
        >
          {badge.rarity === 'legendary' ? '✨ Lendário' :
            badge.rarity === 'epic' ? '💎 Épico' :
              badge.rarity === 'rare' ? '💠 Raro' :
                '⚪ Comum'}
        </div>

        {!isUnlocked && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progresso</span>
              <span>{Math.min(progress, badge.requirement_value)}/{badge.requirement_value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {isUnlocked && (
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            +{badge.xp_reward} XP conquistado
          </div>
        )}
      </div>
    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Droplet, Dumbbell, Flame, Target, Clock, Zap, CheckCircle2 } from 'lucide-react';

export default function ChallengeCard({ challenge, userProgress, onComplete }) {
  const isCompleted = userProgress?.completed || false;
  const progress = userProgress?.progress || 0;
  const progressPercent = (progress / challenge.goal_value) * 100;

  const categoryIcons = {
    water: Droplet,
    exercise: Dumbbell,
    nutrition: Flame,
    mixed: Target
  };

  const categoryColors = {
    water: 'from-blue-400 to-cyan-500',
    exercise: 'from-orange-400 to-red-500',
    nutrition: 'from-green-400 to-emerald-500',
    mixed: 'from-purple-400 to-pink-500'
  };

  const Icon = categoryIcons[challenge.category] || Target;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden border-2 ${
        isCompleted ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent'
      }`}
    >
      {/* Header Gradient */}
      <div className={`h-2 bg-gradient-to-r ${categoryColors[challenge.category]}`} />

      <div className="p-6">
        {/* Top Section */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColors[challenge.category]} flex items-center justify-center shadow-lg`}>
            <Icon className="text-white" size={28} />
          </div>

          {isCompleted ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 rounded-full"
            >
              <CheckCircle2 className="text-emerald-600" size={16} />
              <span className="text-sm font-bold text-emerald-700">Completo</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 rounded-full">
              <Clock className="text-amber-600" size={14} />
              <span className="text-xs font-medium text-amber-700">
                {challenge.type === 'daily' ? 'Hoje' : 'Esta semana'}
              </span>
            </div>
          )}
        </div>

        {/* Challenge Info */}
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {challenge.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {challenge.description}
        </p>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progresso</span>
            <span className="font-bold text-gray-800">
              {progress}/{challenge.goal_value}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${categoryColors[challenge.category]}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercent, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Reward */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="text-white" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Recompensa</p>
              <p className="text-sm font-bold text-amber-600">+{challenge.xp_reward} XP</p>
            </div>
          </div>

          {progressPercent >= 100 && !isCompleted && onComplete && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onComplete(challenge)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all"
            >
              Resgatar
            </motion.button>
          )}
        </div>
      </div>

      {/* Completion Overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
      )}
    </motion.div>
  );
}
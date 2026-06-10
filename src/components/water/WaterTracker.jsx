import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WaterTracker({ consumed = 0, goal = 2000, onAddWater }) {
  const [isAdding, setIsAdding] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [lastXP, setLastXP] = useState(0);
  
  const percentage = Math.min((consumed / goal) * 100, 100);
  const quickAmounts = [100, 250, 500, 1000];

  const calculateXP = (ml) => {
    if (ml >= 1000) return 100;
    if (ml >= 500) return 10;
    if (ml >= 250) return 5;
    return 1;
  };

  const handleAddWater = (amount) => {
    const xp = calculateXP(amount);
    setLastXP(xp);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 2000);
    onAddWater(amount, xp);
    setIsAdding(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 relative overflow-hidden">
      {/* XP Popup */}
      <AnimatePresence>
        {showXP && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 bg-amber-400 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg"
          >
            <Trophy size={16} />
            +{lastXP} XP
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-4">
        <Droplets className="text-blue-500" size={24} />
        <h3 className="font-semibold text-gray-800">Hidratação</h3>
      </div>

      {/* Water Glass Animation */}
      <div className="flex justify-center mb-4">
        <div className="relative w-24 h-32">
          {/* Glass */}
          <div className="absolute inset-0 border-4 border-blue-200 rounded-b-3xl bg-white/50 overflow-hidden">
            {/* Water */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-cyan-400"
              initial={{ height: 0 }}
              animate={{ height: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {/* Waves */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-3"
                animate={{ 
                  backgroundPosition: ['0% 0%', '100% 0%'],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  backgroundSize: '50% 100%'
                }}
              />
            </motion.div>
          </div>
          
          {/* Bubbles */}
          {percentage > 10 && (
            <>
              <motion.div
                className="absolute w-2 h-2 bg-white/60 rounded-full"
                style={{ bottom: '20%', left: '30%' }}
                animate={{ y: [-10, -30], opacity: [1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute w-1.5 h-1.5 bg-white/60 rounded-full"
                style={{ bottom: '15%', left: '60%' }}
                animate={{ y: [-10, -25], opacity: [1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}
        </div>
      </div>

      {/* Progress Info */}
      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-blue-600">{consumed}ml</p>
        <p className="text-sm text-gray-500">de {goal}ml ({Math.round(percentage)}%)</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Quick Add Buttons */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-4 gap-2"
          >
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleAddWater(amount)}
              >
                {amount >= 1000 ? `${amount/1000}L` : `${amount}ml`}
              </Button>
            ))}
          </motion.div>
        ) : (
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={18} className="mr-2" />
            Adicionar Água
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
}